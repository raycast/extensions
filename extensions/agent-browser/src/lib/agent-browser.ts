import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  clearBrowserSessionContext,
  getBrowserArguments,
  getBrowserEnvironment,
  getBrowserSessionContext,
  initializeBrowserSession,
  saveBrowserSessionContext,
} from "./browser-session";
import { closeDiaTabs, openDiaTab, runDiaCommand } from "./dia";
import { closeSafariTabs, openSafariTab } from "./safari";

const execFileAsync = promisify(execFile);
const DEFAULT_SESSION = "raycast";

type RunOptions = {
  session?: string;
  globalArguments?: string[];
  initializeSession?: boolean;
  profile?: string;
};

export type AgentBrowserResult = {
  session: string;
  result: unknown;
};

export async function runAgentBrowser(
  commandArguments: string[],
  options: RunOptions = {},
): Promise<AgentBrowserResult> {
  const session = normalizeSession(options.session);
  const { executablePath } = getPreferenceValues<Preferences>();
  const configuredExecutable = executablePath.trim();
  if (!configuredExecutable)
    throw new Error("Set the Agent Browser Executable preference before using this extension.");

  const initializedSession = options.initializeSession
    ? await initializeBrowserSession(session, options.profile)
    : undefined;
  const browserContext = initializedSession?.context ?? (await getBrowserSessionContext(session));
  if (initializedSession?.isNew) await saveBrowserSessionContext(session, initializedSession.context);

  if (browserContext?.backend === "dia") {
    try {
      if (commandArguments[0] === "open") {
        const url = commandArguments[1];
        if (!url) throw new Error("A URL is required to open a Dia tab.");
        const tab = await openDiaTab(url, browserContext.profile, browserContext.applicationPath);
        browserContext.diaTabIds = [...(browserContext.diaTabIds ?? []), tab.id];
        await saveBrowserSessionContext(session, browserContext);
        const automation = await getDiaAutomationStatus(tab.id, browserContext.applicationPath);
        return {
          session,
          result: {
            success: true,
            browser: "Dia",
            ...tab,
            capabilities: {
              pageInspection: automation.ready,
              pageInteraction: automation.ready,
            },
            nextStep: automation.ready
              ? "Use Inspect Page with this session before interacting with the page."
              : automation.message,
          },
        };
      }
      if (commandArguments[0] === "close") {
        const closedTabs = await closeDiaTabs(browserContext.diaTabIds ?? [], browserContext.applicationPath);
        return { session, result: { success: true, browser: "Dia", closedTabs } };
      }
      const activeTabId = browserContext.diaTabIds?.at(-1);
      return {
        session,
        result: {
          browser: "Dia",
          ...(await runDiaCommand(commandArguments, activeTabId, browserContext.applicationPath)),
        },
      };
    } catch (error) {
      if (initializedSession?.isNew) await clearBrowserSessionContext(session);
      throw error;
    }
  }

  if (browserContext?.backend === "safari") {
    try {
      if (commandArguments[0] === "open") {
        const url = commandArguments[1];
        if (!url) throw new Error("A URL is required to open a Safari tab.");
        const tab = await openSafariTab(url, browserContext.applicationPath);
        browserContext.safariTabs = [...(browserContext.safariTabs ?? []), tab];
        await saveBrowserSessionContext(session, browserContext);
        return { session, result: { success: true, browser: "Safari", ...tab } };
      }
      if (commandArguments[0] === "close") {
        const closedTabs = await closeSafariTabs(browserContext.safariTabs ?? [], browserContext.applicationPath);
        return { session, result: { success: true, browser: "Safari", closedTabs } };
      }
      throw new Error(
        "Safari supports opening and closing live tabs, but does not expose the Chrome DevTools endpoint required for page inspection and interaction.",
      );
    } catch (error) {
      if (initializedSession?.isNew) await clearBrowserSessionContext(session);
      throw error;
    }
  }

  const executable = await resolveAgentBrowserExecutable(configuredExecutable);

  const args = [
    "--session",
    session,
    "--json",
    "--content-boundaries",
    "--max-output",
    "30000",
    ...getBrowserArguments(browserContext),
    ...(options.globalArguments ?? []),
    ...commandArguments,
  ];

  try {
    const { stdout, stderr } = await execFileAsync(executable, args, {
      encoding: "utf8",
      maxBuffer: 1_000_000,
      timeout: 45_000,
      windowsHide: true,
      env: getBrowserEnvironment(browserContext),
    });
    const output = stdout.trim();
    return {
      session,
      result: output ? parseOutput(output) : { success: true, message: stderr.trim() || "Command completed." },
    };
  } catch (error) {
    if (initializedSession?.isNew) {
      try {
        await clearBrowserSessionContext(session);
      } catch {
        // Preserve the agent-browser execution error when best-effort cleanup fails.
      }
    }
    throw new Error(formatExecutionError(error, executable));
  }
}

async function getDiaAutomationStatus(
  tabId: string,
  applicationPath?: string,
): Promise<{ message: string; ready: boolean }> {
  try {
    await runDiaCommand(["get", "title"], tabId, applicationPath);
    return { ready: true, message: "Dia page inspection and interaction are ready." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ready: false, message };
  }
}

async function resolveAgentBrowserExecutable(configured: string): Promise<string> {
  if (configured.includes(path.sep) || (process.platform === "win32" && configured.includes("/"))) {
    await validateAgentBrowserExecutable(configured);
    return configured;
  }

  try {
    const command = process.platform === "win32" ? "where.exe" : process.platform === "darwin" ? "/bin/zsh" : "which";
    const args =
      process.platform === "win32"
        ? [configured]
        : process.platform === "darwin"
          ? ["-lic", 'command -v -- "$1"', "resolve-agent-browser", configured]
          : [configured];
    const { stdout } = await execFileAsync(command, args, { encoding: "utf8", timeout: 10_000 });
    const resolved = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
    if (!resolved) throw new Error();
    await validateAgentBrowserExecutable(resolved);
    return resolved;
  } catch {
    throw new Error(
      `Could not resolve ${configured} to an executable. Set Agent Browser Executable to the full path from \`command -v agent-browser\`.`,
    );
  }
}

async function validateAgentBrowserExecutable(executable: string): Promise<void> {
  try {
    await access(executable, constants.X_OK);
  } catch {
    throw new Error(`Agent Browser Executable is not executable: ${executable}`);
  }
}

export function normalizeSession(value?: string): string {
  const session = value?.trim() || DEFAULT_SESSION;
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(session)) {
    throw new Error("Session names may contain only letters, numbers, dots, underscores, and hyphens.");
  }
  return session;
}

function parseOutput(output: string): unknown {
  try {
    return JSON.parse(output) as unknown;
  } catch {
    return { success: true, output };
  }
}

function formatExecutionError(error: unknown, executable: string): string {
  if (isExecutionError(error)) {
    const details = error.stderr?.trim() || error.stdout?.trim() || error.message;
    if (error.code === "ENOENT") {
      return `Could not find ${executable}. Install agent-browser, or set its full path in the extension preferences.`;
    }
    return details || "agent-browser failed without an error message.";
  }
  return error instanceof Error ? error.message : String(error);
}

function isExecutionError(
  error: unknown,
): error is Error & { code?: string | number; stdout?: string; stderr?: string } {
  return error instanceof Error;
}
