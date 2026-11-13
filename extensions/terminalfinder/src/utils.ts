import { Application, Clipboard, getApplications, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { findApplication } from "./application";
import { extractCmuxWorkingDirectory } from "./cmux";
import { formatCmuxError } from "./cmux-error";
import { extractTernWorkingDirectory, type TernSessionList } from "./tern";

export async function runAppleScript(script: string) {
  if (process.platform !== "darwin") {
    throw new Error("macOS only");
  }

  const locale = process.env.LC_ALL;
  delete process.env.LC_ALL;
  const { stdout, stderr } = spawnSync("osascript", ["-e", script]);
  process.env.LC_ALL = locale;
  if (stderr?.length) throw new Error(stderr.toString());
  return stdout.toString();
}

export type Terminal = Exclude<Arguments.Index["to"], "Clipboard">;
export const isTerminal = (val: string): val is Terminal => val !== "Clipboard" && val !== "Finder";

export async function getApplication(name: Terminal): Promise<Application> {
  const applications = await getApplications();
  const app = findApplication(applications, name);
  if (!app) throw new Error(`${name} not found`);
  return app;
}

// Raycast 2 resolves an application name by substring over every app's name, bundle ID and path, so "Finder"
// can pick Finder's own AirDrop helper app. Passing an absolute path to open() skips that lookup.
const FINDER_PATH = "/System/Library/CoreServices/Finder.app";

export async function openInFinder(directory: string) {
  await open(directory, FINDER_PATH);
}

const CMUX_COMMAND_TIMEOUT_MS = 10_000;

function formatCmuxProcessError(error: NodeJS.ErrnoException) {
  if (error.code === "ETIMEDOUT") {
    return new Error(
      "cmux command timed out. In cmux, open Settings -> Automation and set Socket Mode to Allow all local processes or Password.",
    );
  }

  return error;
}

export async function runCmuxCommand(args: string[]) {
  const app = await getApplication("cmux");
  const cliPath = path.join(app.path, "Contents", "Resources", "bin", "cmux");
  const result = spawnSync(cliPath, args, { encoding: "utf8", timeout: CMUX_COMMAND_TIMEOUT_MS });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  if (result.error) {
    throw formatCmuxProcessError(result.error);
  }

  if (result.status !== 0) {
    throw new Error(formatCmuxError(output));
  }

  return result.stdout.trim();
}

export async function getCmuxWorkingDirectory() {
  const stdout = await runCmuxCommand(["--json", "sidebar-state"]);
  const parsed = JSON.parse(stdout) as unknown;
  return extractCmuxWorkingDirectory(parsed);
}

const TERN_COMMAND_TIMEOUT_MS = 10_000;

async function runTernCommand(args: string[]) {
  const app = await getApplication("Tern");
  const cliPath = path.join(app.path, "Contents", "MacOS", "tern");
  const result = spawnSync(cliPath, args, { encoding: "utf8", timeout: TERN_COMMAND_TIMEOUT_MS });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "tern command failed");
  }

  return result.stdout;
}

export async function getTernWorkingDirectory() {
  const stdout = await runTernCommand(["ls", "--json"]);
  return extractTernWorkingDirectory(JSON.parse(stdout) as TernSessionList);
}

export async function clipboardToApplication(name: Terminal) {
  try {
    const directory = (await Clipboard.readText()) || "";
    const app = await getApplication(name);
    await open(directory, app.path);
    await showToast(Toast.Style.Success, "Done");
  } catch (err) {
    await showFailureToast(err);
  }
}
export async function applicationToFinder(name: Terminal) {
  const script = `
    if application "${name}" is not running then
      error "${name} is not running"
    end if

    tell application "Finder" to activate
    tell application "${name}" to activate
    tell application "System Events"
      keystroke "open -a Finder ./"
      key code 76
    end tell
  `;
  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showFailureToast(err);
  }
}
export async function finderToApplication(name: Terminal) {
  const script = `
    if application "Finder" is not running then
        return "Finder is not running"
    end if

    tell application "Finder"
      if (count of Finder windows) = 0 then error "No Finder window open"
      try
        set pathList to POSIX path of (folder of the front window as alias)
        return pathList
      on error
        error "Could not access Finder window path"
      end try
    end tell
  `;
  try {
    const directory = await runAppleScript(script);
    const app = await getApplication(name);
    await open(directory.trim(), app.path);
    await showToast(Toast.Style.Success, "Done");
  } catch (err) {
    await showFailureToast(err);
  }
}
