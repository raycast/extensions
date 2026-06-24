import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { runAppleScript } from "@raycast/utils";

import { buildPasswordManagerUrl, PASSWORD_MANAGER_URL_PREFIX } from "./url";

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildMacAppleScript(query?: string): string {
  const trimmedQuery = query?.trim();
  const hasQuery = Boolean(trimmedQuery);
  const targetUrl = buildPasswordManagerUrl(trimmedQuery);
  const escapedUrl = escapeAppleScriptString(targetUrl);
  const escapedPrefix = escapeAppleScriptString(PASSWORD_MANAGER_URL_PREFIX);

  return `
tell application "Google Chrome"
  activate
  set targetPrefix to "${escapedPrefix}"
  set hasQuery to ${hasQuery}
  set foundTab to false

  repeat with w in windows
    set tabIndex to 1
    repeat with t in tabs of w
      if (URL of t) starts with targetPrefix then
        set index of w to 1
        set active tab index of w to tabIndex
        set foundTab to true
        exit repeat
      end if
      set tabIndex to tabIndex + 1
    end repeat
    if foundTab then exit repeat
  end repeat

  if foundTab then
    if hasQuery then
      set URL of active tab of front window to "${escapedUrl}"
    end if
  else
    if (count of windows) = 0 then make new window
    tell front window
      make new tab at end of tabs with properties {URL:"${escapedUrl}"}
      set active tab index to (count of tabs)
    end tell
  end if
end tell
`;
}

function resolveWindowsChromeExecutable(customPath?: string): string {
  const configuredPath = customPath?.trim();

  if (configuredPath) {
    if (!existsSync(configuredPath)) {
      throw new Error(`Chrome executable not found at ${configuredPath}`);
    }

    return configuredPath;
  }

  const candidates = [
    path.join(process.env["ProgramFiles"] ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["ProgramFiles(x86)"] ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
  ];

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Google Chrome was not found. Install Chrome or set the Chrome Executable path in extension preferences.",
  );
}

async function openOnMac(query?: string): Promise<void> {
  await runAppleScript(buildMacAppleScript(query));
}

function openOnWindows(query?: string, chromeExecutable?: string): void {
  const executable = resolveWindowsChromeExecutable(chromeExecutable);
  const url = buildPasswordManagerUrl(query);
  const child = spawn(executable, [url], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();
}

export async function openChromePasswordManager(query?: string, chromeExecutable?: string): Promise<void> {
  if (process.platform === "darwin") {
    await openOnMac(query);
    return;
  }

  if (process.platform === "win32") {
    openOnWindows(query, chromeExecutable);
    return;
  }

  throw new Error("Password Manager for Chrome is only supported on macOS and Windows.");
}
