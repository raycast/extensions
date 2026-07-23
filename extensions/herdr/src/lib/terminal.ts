import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Application } from "@raycast/api";
import { getHerdrPreferences } from "./preferences";
import { resolveHerdrBinary, runHerdrJson } from "./herdr";
import { lookupHerdrClientTtys } from "./process-lookup";
import { shellQuote } from "./parsers";
import { detectTerminalKind, expandCustomLauncher } from "./terminal-config";
import {
  buildGhosttyFocusScript,
  buildITermFocusScript,
  buildTerminalFocusScript,
  selectWezTermPane,
  selectWezTermWindow,
} from "./terminal-focus";

const FAST_FOCUS_TIMEOUT_MS = 450;
const PROCESS_LOOKUP_TIMEOUT_MS = 250;
type ClientFocusResult = "focused" | "missing" | "unavailable";

function execCapture(path: string, args: string[], timeout = 5_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(path, args, { timeout, encoding: "utf8" }, (error, stdout) =>
      error ? reject(error) : resolve(stdout.trim()),
    );
  });
}

async function exec(path: string, args: string[], timeout?: number): Promise<void> {
  await execCapture(path, args, timeout);
}

async function tryExecCapture(path: string, args: string[], timeout: number): Promise<string | undefined> {
  try {
    return await execCapture(path, args, timeout);
  } catch {
    return undefined;
  }
}

function appleScriptString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n")}"`;
}

function spawnDetached(executable: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function selectedApplication(): Application | undefined {
  return getHerdrPreferences().terminalApplication;
}

function selectedSession(): string {
  return getHerdrPreferences().sessionName?.trim() || "default";
}

function wezTermExecutable(application: Application | undefined): string | undefined {
  if (!application?.path) return undefined;
  return join(application.path, "Contents", "MacOS", "wezterm");
}

export async function bringTerminalToFront(): Promise<void> {
  const application = selectedApplication();
  if (application?.bundleId) {
    await exec("/usr/bin/open", ["-b", application.bundleId]);
  } else if (application?.path) {
    await exec("/usr/bin/open", [application.path]);
  } else if (application?.name) {
    await exec("/usr/bin/open", ["-a", application.name]);
  } else {
    await exec("/usr/bin/open", ["-a", "Terminal"]);
  }
}

async function focusExistingHerdrClient(): Promise<ClientFocusResult> {
  const application = selectedApplication();
  const kind = detectTerminalKind(application || { bundleId: "com.apple.Terminal", name: "Terminal", path: "" });

  if (kind === "terminal" || kind === "iterm") {
    const binary = await resolveHerdrBinary();
    const ttys = await lookupHerdrClientTtys(binary, selectedSession(), PROCESS_LOOKUP_TIMEOUT_MS);
    if (ttys === undefined) return "unavailable";
    if (ttys.length === 0) return "missing";
    const script = kind === "terminal" ? buildTerminalFocusScript(ttys) : buildITermFocusScript(ttys);
    const focusedTty = await tryExecCapture("/usr/bin/osascript", ["-e", script], FAST_FOCUS_TIMEOUT_MS);
    if (focusedTty === undefined) return "unavailable";
    return focusedTty === "miss" ? "missing" : "focused";
  }

  if (kind === "ghostty") {
    const marker = `herdr-raycast-${randomUUID()}`;
    let changedTitle = false;
    try {
      const title = await runHerdrJson<{ changed: boolean; reason: string }>(["terminal", "title", "set", marker], {
        timeout: FAST_FOCUS_TIMEOUT_MS,
      });
      if (!title.changed) return title.reason === "no_foreground_client" ? "missing" : "unavailable";
      changedTitle = true;

      const script = buildGhosttyFocusScript(marker);
      const result = await tryExecCapture("/usr/bin/osascript", ["-e", script], FAST_FOCUS_TIMEOUT_MS);
      if (result === undefined) return "unavailable";
      return result === "focused" ? "focused" : "unavailable";
    } catch {
      return "unavailable";
    } finally {
      if (changedTitle) {
        await runHerdrJson(["terminal", "title", "clear"], { timeout: FAST_FOCUS_TIMEOUT_MS }).catch(() => undefined);
      }
    }
  }

  if (kind === "wezterm") {
    const executable = wezTermExecutable(application);
    if (!executable) return "unavailable";
    const [listing, binary] = await Promise.all([
      tryExecCapture(executable, ["cli", "list", "--format", "json"], FAST_FOCUS_TIMEOUT_MS),
      resolveHerdrBinary(),
    ]);
    if (!listing) return "unavailable";
    const ttys = await lookupHerdrClientTtys(binary, selectedSession(), PROCESS_LOOKUP_TIMEOUT_MS);
    if (ttys === undefined) return "unavailable";
    const paneId = selectWezTermPane(listing, ttys);
    if (!paneId) return "missing";
    const focused = await tryExecCapture(
      executable,
      ["cli", "activate-pane", "--pane-id", paneId],
      FAST_FOCUS_TIMEOUT_MS,
    );
    if (focused === undefined) return "unavailable";
    await bringTerminalToFront();
    return "focused";
  }

  return "unavailable";
}

export async function revealFocusedHerdr(): Promise<boolean> {
  if (String(getHerdrPreferences().terminalFocusBehavior || "open") === "none") return false;

  const result = await focusExistingHerdrClient();
  if (result === "missing") {
    await launchHerdrInTerminal();
  } else if (result === "unavailable") {
    await bringTerminalToFront();
  }
  return true;
}

async function launchWarp(appTarget: string, command: string): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "herdr-raycast-"));
  const launcher = join(directory, "Open Herdr.command");
  await writeFile(launcher, `#!/bin/zsh\nexec ${command}\n`, { encoding: "utf8", mode: 0o700 });
  await chmod(launcher, 0o700);
  await exec("/usr/bin/open", ["-na", appTarget, launcher]);
  const cleanup = setTimeout(() => void rm(directory, { recursive: true, force: true }).catch(() => undefined), 60_000);
  cleanup.unref();
}

export async function launchHerdrInTerminal(
  args: string[] = [],
  options: { includePreferredSession?: boolean } = {},
): Promise<void> {
  const binary = await resolveHerdrBinary();
  const application = selectedApplication();
  const sessionName = options.includePreferredSession === false ? undefined : getHerdrPreferences().sessionName?.trim();
  const sessionArgs = sessionName && sessionName !== "default" ? ["--session", sessionName, ...args] : args;
  const command = [binary, ...sessionArgs].map(shellQuote).join(" ");
  const customLauncher = getHerdrPreferences().customTerminalLauncher?.trim();
  if (customLauncher) {
    const [executable, launcherArgs] = expandCustomLauncher(customLauncher, binary, sessionArgs);
    await spawnDetached(executable, launcherArgs);
    return;
  }
  const kind = detectTerminalKind(application || { bundleId: "com.apple.Terminal", name: "Terminal", path: "" });

  if (kind === "terminal") {
    const script = `tell application "Terminal"\nactivate\ndo script ${appleScriptString(command)}\nend tell`;
    await exec("/usr/bin/osascript", ["-e", script]);
    return;
  }
  if (kind === "iterm") {
    const script = `tell application "iTerm"
activate
if (count windows) > 0 then
  set targetWindow to current window
  set targetTab to create tab with default profile targetWindow
  set targetSession to current session of targetTab
else
  set targetWindow to create window with default profile
  set targetSession to current session of targetWindow
end if
tell targetSession to write text ${appleScriptString(command)}
end tell`;
    await exec("/usr/bin/osascript", ["-e", script]);
    return;
  }

  const appTarget = application?.path || application?.name;
  if (!appTarget) {
    await exec("/usr/bin/open", ["-a", "Terminal"]);
    return;
  }
  if (kind === "ghostty") {
    const script = `tell application "Ghostty"
activate
set cfg to new surface configuration
set command of cfg to ${appleScriptString(command)}
if (count windows) > 0 then
  new tab in front window with configuration cfg
else
  new window with configuration cfg
end if
return "opened"
end tell`;
    if ((await tryExecCapture("/usr/bin/osascript", ["-e", script], 1_500)) === "opened") return;
    await exec("/usr/bin/open", ["-na", appTarget, "--args", "-e", binary, ...sessionArgs]);
    return;
  }
  if (kind === "alacritty") {
    await exec("/usr/bin/open", ["-na", appTarget, "--args", "-e", binary, ...sessionArgs]);
    return;
  }
  if (kind === "wezterm") {
    const executable = wezTermExecutable(application);
    if (executable) {
      const listing = await tryExecCapture(executable, ["cli", "list", "--format", "json"], FAST_FOCUS_TIMEOUT_MS);
      const windowId = listing ? selectWezTermWindow(listing) : undefined;
      const paneId = await tryExecCapture(
        executable,
        ["cli", "spawn", ...(windowId ? ["--window-id", windowId] : ["--new-window"]), "--", binary, ...sessionArgs],
        750,
      );
      if (paneId && /^\d+$/.test(paneId)) {
        await bringTerminalToFront();
        return;
      }
    }
    await exec("/usr/bin/open", ["-na", appTarget, "--args", "start", "--", binary, ...sessionArgs]);
    return;
  }
  if (kind === "kitty") {
    const kittyExecutable = application?.path ? join(application.path, "Contents", "MacOS", "kitty") : undefined;
    if (kittyExecutable) await spawnDetached(kittyExecutable, [binary, ...sessionArgs]);
    else await exec("/usr/bin/open", ["-na", appTarget, "--args", binary, ...sessionArgs]);
    return;
  }
  if (kind === "warp") {
    await launchWarp(appTarget, command);
    return;
  }
  await exec("/usr/bin/open", ["-na", appTarget, "--args", "-e", binary, ...sessionArgs]);
}
