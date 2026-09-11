import { execFile } from "node:child_process";
import { LocalStorage } from "@raycast/api";
import { env } from "../config";
import { escapeAppleScriptString } from "./shellUtils";
import fs from "node:fs";

export type OpenTarget = "tab" | "window";

export class UnsupportedTerminalError extends Error {}

export interface TerminalCapabilities {
  bundleId: string;
  name: string;
  supportsTab: boolean;
  supportsWindow: boolean;
}

interface TerminalLauncher {
  name: string;
  openTab?: (shellCommand: string) => Promise<void>;
  openWindow?: (shellCommand: string) => Promise<void>;
}

function run(file: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { env }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve();
    });
  });
}

function resolveBinary(name: string, appBundlePath: string): string {
  const candidates = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"].map((dir) => `${dir}/${name}`);
  candidates.push(appBundlePath);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? name;
}

function runAppleScript(lines: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "osascript",
      lines.flatMap((line) => ["-e", line]),
      { env },
      (error, _stdout, stderr) => {
        if (error) {
          const message = stderr || error.message;
          if (message.includes("-1743")) {
            reject(
              new Error(
                "Raycast is not allowed to control the terminal. Enable it in System Settings → Privacy & Security → Automation.",
              ),
            );
            return;
          }
          reject(new Error(message));
          return;
        }
        resolve();
      },
    );
  });
}

function iTermScript(target: OpenTarget, shellCommand: string): string[] {
  const command = escapeAppleScriptString(shellCommand);
  const writeToNewWindow = [
    "set newWindow to (create window with default profile)",
    `tell current session of newWindow to write text "${command}"`,
  ];

  if (target === "window") {
    return ['tell application "iTerm2"', "activate", ...writeToNewWindow, "end tell"];
  }

  return [
    'tell application "iTerm2"',
    "activate",
    "if (count of windows) = 0 then",
    ...writeToNewWindow,
    "else",
    "tell current window",
    "set newTab to (create tab with default profile)",
    `tell current session of newTab to write text "${command}"`,
    "end tell",
    "end if",
    "end tell",
  ];
}

function ghosttyScript(target: OpenTarget, shellCommand: string): string[] {
  const command = escapeAppleScriptString(shellCommand);
  const configuration = `{initial input:"${command}" & linefeed}`;

  if (target === "window") {
    return ['tell application "Ghostty"', "activate", `new window with configuration ${configuration}`, "end tell"];
  }

  return [
    'tell application "Ghostty"',
    "activate",
    "if (count of windows) = 0 then",
    `new window with configuration ${configuration}`,
    "else",
    `new tab with configuration ${configuration}`,
    "end if",
    "end tell",
  ];
}

function terminalAppScript(shellCommand: string): string[] {
  const command = escapeAppleScriptString(shellCommand);

  return ['tell application "Terminal"', "activate", `do script "${command}"`, "end tell"];
}

function openKittyTab(shellCommand: string): Promise<void> {
  const socket = fs.readdirSync("/tmp").find((entry) => entry.startsWith("kitty"));

  if (!socket) {
    return Promise.reject(
      new Error(
        "kitty remote control is not enabled. Add `allow_remote_control yes` and `listen_on unix:/tmp/kitty` to kitty.conf",
      ),
    );
  }

  const kitten = resolveBinary("kitten", "/Applications/kitty.app/Contents/MacOS/kitten");

  return run(kitten, ["@", "--to", `unix:/tmp/${socket}`, "launch", "--type=tab", "/bin/sh", "-lc", shellCommand]);
}

async function openWezTermWindow(shellCommand: string): Promise<void> {
  const wezterm = resolveBinary("wezterm", "/Applications/WezTerm.app/Contents/MacOS/wezterm");

  try {
    await run(wezterm, ["cli", "spawn", "--new-window", "--", "/bin/sh", "-lc", shellCommand]);
  } catch (e) {
    // The cli needs a running GUI instance; fall back to launching one
    await run("open", ["-na", "WezTerm", "--args", "start", "--", "/bin/sh", "-lc", shellCommand]);
  }
}

const LAUNCHERS: Record<string, TerminalLauncher> = {
  "com.googlecode.iterm2": {
    name: "iTerm2",
    openTab: (shellCommand) => runAppleScript(iTermScript("tab", shellCommand)),
    openWindow: (shellCommand) => runAppleScript(iTermScript("window", shellCommand)),
  },
  "com.apple.Terminal": {
    name: "Terminal",
    openWindow: (shellCommand) => runAppleScript(terminalAppScript(shellCommand)),
  },
  "com.mitchellh.ghostty": {
    name: "Ghostty",
    openTab: (shellCommand) => runAppleScript(ghosttyScript("tab", shellCommand)),
    openWindow: (shellCommand) => runAppleScript(ghosttyScript("window", shellCommand)),
  },
  "com.github.wez.wezterm": {
    name: "WezTerm",
    openTab: (shellCommand) => {
      const wezterm = resolveBinary("wezterm", "/Applications/WezTerm.app/Contents/MacOS/wezterm");
      return run(wezterm, ["cli", "spawn", "--", "/bin/sh", "-lc", shellCommand]);
    },
    openWindow: openWezTermWindow,
  },
  "net.kovidgoyal.kitty": {
    name: "kitty",
    openTab: openKittyTab,
    openWindow: (shellCommand) => run("open", ["-na", "kitty", "--args", "/bin/sh", "-lc", shellCommand]),
  },
  "org.alacritty": {
    name: "Alacritty",
    openWindow: (shellCommand) => run("open", ["-na", "Alacritty", "--args", "-e", "/bin/sh", "-lc", shellCommand]),
  },
  "dev.warp.Warp-Stable": {
    name: "Warp",
  },
};

export async function getTerminalCapabilities(): Promise<TerminalCapabilities | null> {
  const bundleId = await LocalStorage.getItem<string>("terminalAppBundleId");

  if (!bundleId) {
    return null;
  }

  const launcher = LAUNCHERS[bundleId];

  return {
    bundleId,
    name: launcher?.name ?? bundleId,
    supportsTab: Boolean(launcher?.openTab),
    supportsWindow: Boolean(launcher?.openWindow),
  };
}

export async function openCommandInTerminal(target: OpenTarget, shellCommand: string): Promise<void> {
  const capabilities = await getTerminalCapabilities();

  if (!capabilities) {
    throw new Error("No terminal app configured");
  }

  const launcher = LAUNCHERS[capabilities.bundleId];
  const launch = target === "tab" ? launcher?.openTab : launcher?.openWindow;

  if (!launch) {
    throw new UnsupportedTerminalError(`Opening a new ${target} is not supported for ${capabilities.name}`);
  }

  await launch(shellCommand);
}
