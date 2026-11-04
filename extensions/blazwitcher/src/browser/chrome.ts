import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { BrowserEntry, ChromeTabGroup } from "../types";
import {
  CAPTURE_CONTEXT_SCRIPT,
  OPEN_URL_SCRIPT,
  FOCUS_TAB_SCRIPT,
  LIST_TABS_SCRIPT,
} from "./chrome-scripts";
import { discoverProfiles, isProfileId } from "./profiles";
import { readTabGroups } from "./tab-groups";

const executeFile = promisify(execFile);

async function runJxa(script: string, args: string[]) {
  const { stdout } = await executeFile(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", script, ...args],
    {
      timeout: 15000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  return stdout.trim();
}

export async function readTabs(
  includeIncognito: boolean,
): Promise<{ running: boolean; tabs: BrowserEntry[] }> {
  const groups = discoverProfiles()
    .then(({ profiles }) => readTabGroups(profiles))
    .catch(() => new Map<string, ChromeTabGroup>());
  const result = JSON.parse(
    await runJxa(LIST_TABS_SCRIPT, [String(includeIncognito)]),
  ) as { running: boolean; tabs: BrowserEntry[] };
  return { ...result, tabs: enrichTabGroups(result.tabs, await groups) };
}

export function enrichTabGroups(
  tabs: BrowserEntry[],
  groups: Awaited<ReturnType<typeof readTabGroups>>,
) {
  return tabs.map((tab) => {
    const tabGroup = tab.tabId ? groups.get(tab.tabId) : undefined;
    return tabGroup ? { ...tab, tabGroup } : tab;
  });
}

export interface ChromeContext {
  windowId: string;
  tabId: string;
}

export async function captureChromeContext(): Promise<ChromeContext | null> {
  return JSON.parse(await runJxa(CAPTURE_CONTEXT_SCRIPT, []));
}

function validateUrl(url: string) {
  const parsed = new URL(url);
  if (
    !["http:", "https:", "file:", "chrome:", "about:"].includes(parsed.protocol)
  ) {
    throw new Error(
      "This URL type cannot be opened directly. Copy the URL and open it manually.",
    );
  }
}

export async function openCapturedUrl(
  url: string,
  mode: "newTab" | "here",
  target: ChromeContext | null,
) {
  validateUrl(url);
  await runJxa(OPEN_URL_SCRIPT, [JSON.stringify({ mode, url, target })]);
}

export function openUrlArguments(entry: BrowserEntry): string[] {
  validateUrl(entry.url);
  if (!entry.profile || !isProfileId(entry.profile.id))
    throw new Error(
      "No valid Chrome profile was found. Reopen the command and try again.",
    );
  return [
    "-na",
    "Google Chrome",
    "--args",
    `--profile-directory=${entry.profile.id}`,
    entry.url,
  ];
}

export async function navigateTo(entry: BrowserEntry) {
  if (entry.source === "tab") {
    if (!entry.tabId || !/^[1-9]\d*$/.test(entry.tabId))
      throw new Error("INVALID_TAB_ID");
    await runJxa(FOCUS_TAB_SCRIPT, [entry.tabId]);
  } else {
    await executeFile("/usr/bin/open", openUrlArguments(entry), {
      timeout: 10000,
    });
  }
}

export function describeError(error: unknown, application = "Raycast"): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("-1743"))
    return `Allow ${application} to control Google Chrome in System Settings → Privacy & Security → Automation.`;
  if (message.includes("TARGET_WINDOW_NOT_FOUND"))
    return "The Chrome window captured when this command opened has been closed. Reopen the command and try again.";
  if (message.includes("TARGET_TAB_NOT_FOUND"))
    return "The tab captured when this command opened has been closed or moved to another window. Reopen the command and try again.";
  if (message.includes("NO_CURRENT_TAB"))
    return "There was no active tab when this command opened. Use Open in New Tab.";
  if (message.includes("INVALID_TARGET"))
    return "Invalid browser target. Reopen the command and try again.";
  if (message.includes("UNSUPPORTED_URL"))
    return "This URL type cannot be opened directly. Copy the URL and open it manually.";
  if (message.includes("TAB_NOT_FOUND"))
    return "This tab has been closed. Reopen the command.";
  if (message.includes("CHROME_NOT_RUNNING"))
    return "Chrome is not running. Start Chrome and reopen the command.";
  if (message.includes("TAB_MOVED_DURING_FOCUS"))
    return "The tab moved. Try again.";
  if (message.includes("TABS_CHANGED_DURING_READ"))
    return "Chrome tabs are changing. Reopen the command and try again.";
  if (message.includes("INVALID_TAB_ID"))
    return "Invalid tab ID. Reopen the command.";
  if (
    /EPERM|EACCES|authorization denied|unable to open database/i.test(message)
  )
    return `Could not read local Chrome data. Check file access permissions for ${application}.`;
  if (/locked|busy/i.test(message))
    return "Chrome history database is busy. Reopen the command later.";
  if (/ENOENT/.test(message))
    return "No Chrome profile directory was found. Start Google Chrome first.";
  if (/timed out|ETIMEDOUT|killed/.test(message))
    return "The Chrome operation timed out. Try again later.";
  if (/This URL type|No valid Chrome profile/.test(message)) return message;
  return "Could not read or control Chrome. Reopen the command and try again. Available sources can still be searched.";
}
