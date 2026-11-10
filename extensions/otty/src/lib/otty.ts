import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { promisify } from "node:util";
import {
  Clipboard,
  getFrontmostApplication,
  getPreferenceValues,
  getSelectedFinderItems,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import {
  DEFAULT_OTTY_CLI_PATH,
  buildActivateOttyArgs,
  buildCaptureArgs,
  buildFinderDirectoryScriptArgs,
  buildJumpListArgs,
  buildListArgs,
  buildNewTabArgs,
  buildOpenWindowArgs,
  buildRunCommandArgs,
  buildSshCommandArgs,
  buildViewFileArgs,
  errorMessage,
  parseOttyJson,
  rankByRecentVisits,
  type JumpEntry,
} from "./otty-core";
import { basename, classifyPaths } from "./paths";
import {
  buildSections,
  countOf,
  type OttyPane,
  type OttyTab,
  type OttyWindow,
  type Section,
  type ViewMode,
} from "./workspace";

const execFileAsync = promisify(execFile);

const FINDER_BUNDLE_ID = "com.apple.finder";
const PREVIEW_LINES = 40;
const JUMP_LIMIT = 200;

export function getConfiguredCliPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.ottyCliPath.trim() || DEFAULT_OTTY_CLI_PATH;
}

export class OttyCliMissingError extends Error {}

/** Otty exits 3 when no running app answers on its control socket. */
export class OttyNotRunningError extends Error {}

export async function assertExecutable(path: string): Promise<void> {
  try {
    await access(path, constants.F_OK | constants.X_OK);
  } catch {
    throw new OttyCliMissingError(
      `Otty CLI not found or not executable at ${path}. Install Otty or update the Otty CLI Path preference.`,
    );
  }
}

function describeExit(code: unknown): string | undefined {
  switch (code) {
    case 4:
      return "That pane, tab, or window no longer exists.";
    case 7:
      return "Otty refused the input. Enable “Allow Send Keys” in Otty ▸ Settings ▸ Agents ▸ Skills; SSH and sudo panes also need “Allow Sensitive Sessions”.";
    default:
      return undefined;
  }
}

export async function readOtty(args: string[]): Promise<string> {
  const cliPath = getConfiguredCliPath();
  await assertExecutable(cliPath);
  try {
    const { stdout } = await execFileAsync(cliPath, args);
    return stdout;
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (code === 3) throw new OttyNotRunningError("Otty isn't running.");
    const reason = describeExit(code);
    if (reason) throw new Error(reason);
    // Otty explains most failures on stderr ("error: parse error: …").
    const stderr = String((error as { stderr?: unknown }).stderr ?? "").trim();
    throw stderr ? new Error(stderr.replace(/^error:\s*/, "")) : error;
  }
}

export async function runOtty(args: string[]): Promise<void> {
  await readOtty(args);
}

export async function runOttyJson<T>(args: string[]): Promise<T> {
  return parseOttyJson<T>(await readOtty(args));
}

export type Workspace = {
  windows: OttyWindow[];
  tabs: OttyTab[];
  panes: OttyPane[];
};

export async function loadWorkspace(): Promise<Workspace> {
  const [windows, tabs, panes] = await Promise.all([
    runOttyJson<OttyWindow[]>(buildListArgs("window")),
    runOttyJson<OttyTab[]>(buildListArgs("tab")),
    runOttyJson<OttyPane[]>(buildListArgs("pane")),
  ]);
  return { windows, tabs, panes };
}

export function sectionsFor(mode: ViewMode, workspace: Workspace): Section[] {
  return buildSections(mode, workspace.windows, workspace.tabs, workspace.panes, homedir());
}

export async function capturePane(paneId: string): Promise<string> {
  return readOtty(buildCaptureArgs(paneId, PREVIEW_LINES));
}

export async function loadJumpEntries(): Promise<JumpEntry[]> {
  const data = await runOttyJson<{ entries: JumpEntry[] }>(buildJumpListArgs(JUMP_LIMIT));
  return rankByRecentVisits(data.entries, Date.now() / 1000);
}

export async function showFailure(title: string, error: unknown) {
  const message = errorMessage(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: {
      title: "Copy Error",
      onAction: async () => {
        await Clipboard.copy(message);
      },
    },
  });
}

/**
 * The CLI opens tabs and windows without bringing Otty forward. Resolves to the
 * error when activation fails: the open itself already succeeded, so callers
 * report it on its own rather than as a failed open (which invites a retry and a
 * duplicate tab).
 */
export async function activateOtty(): Promise<unknown> {
  try {
    await execFileAsync("/usr/bin/open", buildActivateOttyArgs());
    return undefined;
  } catch (error) {
    return error ?? new Error("Could not activate Otty.");
  }
}

export async function showStayedInBackground(opened: string, error: unknown): Promise<void> {
  await showFailure(`${opened}, but Otty stayed in the background`, error);
}

/** Brings Otty forward, then confirms with a HUD, or says it stayed in the background. */
export async function confirmOpened(title: string): Promise<void> {
  const activationError = await activateOtty();
  if (activationError) await showStayedInBackground(title, activationError);
  else await showHUD(title);
}

export async function runOttyCommand(label: string, args: string[]): Promise<void> {
  try {
    await runOtty(args);
  } catch (error) {
    await showFailure(`${label} failed`, error);
    return;
  }
  await confirmOpened(label);
}

export async function openOtty(): Promise<void> {
  try {
    const selected = await getSelectedFinderItems().catch(() => []);
    const selection = await classifyPaths(selected.map((item) => item.path));
    const { files } = selection;
    let { directories } = selection;

    if (directories.length === 0 && files.length === 0) {
      const app = await getFrontmostApplication().catch(() => undefined);
      if (app?.bundleId !== FINDER_BUNDLE_ID) {
        throw new Error("Select a folder or file in Finder, then try again.");
      }
      const { stdout } = await execFileAsync("/usr/bin/osascript", buildFinderDirectoryScriptArgs());
      directories = [stdout.trim()].filter(Boolean);
      if (directories.length === 0) {
        throw new Error("Finder did not return a folder.");
      }
    }

    let opened: "tab" | "window" = "tab";
    for (const directory of directories) {
      opened = await openInTab(directory);
    }
    for (const file of files) {
      await runOtty(buildViewFileArgs(file));
    }

    const only = [...directories, ...files];
    await confirmOpened(
      only.length === 1
        ? `Opened ${basename(only[0])} in new Otty ${files.length ? "tab" : opened}`
        : `Opened ${countOf(only.length, "item")} in Otty`,
    );
  } catch (error) {
    await showFailure("Could not open in Otty", error);
  }
}

export async function openInTab(directory?: string): Promise<"tab" | "window"> {
  let opened: "tab" | "window" = "tab";
  try {
    await runOtty(buildNewTabArgs(directory));
  } catch {
    await runOtty(buildOpenWindowArgs(directory));
    opened = "window";
  }
  return opened;
}

export async function openNewWindow(): Promise<void> {
  await runOttyCommand("Opened new Otty window", buildOpenWindowArgs());
}

export async function openNewTab(): Promise<void> {
  try {
    const opened = await openInTab();
    await confirmOpened(`Opened new Otty ${opened}`);
  } catch (error) {
    await showFailure("Opened new Otty window failed", error);
  }
}

export async function openDirectory(directory: string): Promise<void> {
  await runOttyCommand("Opened directory in Otty", buildOpenWindowArgs(directory));
}

export async function runShellCommand(command: string): Promise<void> {
  await runOttyCommand("Running command in Otty", buildRunCommandArgs(command));
}

export async function openSshTarget(input: string): Promise<void> {
  let args: string[];
  try {
    args = buildSshCommandArgs(input);
  } catch (error) {
    await showFailure("Opening SSH in Otty failed", error);
    return;
  }
  await runOttyCommand("Opening SSH in Otty", args);
}
