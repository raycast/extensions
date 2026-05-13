import { LocalStorage } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { execSync, execFileSync } from "child_process";
import { existsSync } from "fs";
import type { KnownPrompts } from "./types";

type TerminalApp =
  | "Warp"
  | "iTerm2"
  | "Ghostty"
  | "WezTerm"
  | "Alacritty"
  | "Kitty"
  | "cmux"
  | "Terminal";

export async function getKnownPrompts(): Promise<KnownPrompts> {
  const knownPrompts = await LocalStorage.getItem<string>("known-prompts");
  if (!knownPrompts) return {};
  return JSON.parse(knownPrompts);
}

export async function addKnownPrompt(
  prompt: string,
  command: string
): Promise<void> {
  const knownPrompts = await getKnownPrompts();
  await LocalStorage.setItem(
    "known-prompts",
    JSON.stringify({ ...knownPrompts, [prompt]: command })
  );
}

function isTerminalInstalled(terminal: TerminalApp): boolean {
  const paths: Record<TerminalApp, string[]> = {
    Warp: ["/Applications/Warp.app"],
    iTerm2: ["/Applications/iTerm.app", "/Applications/iTerm2.app"],
    Ghostty: ["/Applications/Ghostty.app"],
    WezTerm: ["/Applications/WezTerm.app"],
    Alacritty: ["/Applications/Alacritty.app"],
    Kitty: ["/Applications/Kitty.app"],
    cmux: ["/usr/local/bin/cmux", "/opt/homebrew/bin/cmux"],
    Terminal: [],
  };
  return paths[terminal].some((path) => existsSync(path));
}

function detectDefaultTerminal(): TerminalApp {
  // Check environment variable first (set by shells like zsh)
  const termProgram = process.env.TERM_PROGRAM;
  if (termProgram === "iTerm.app") return "iTerm2";
  if (termProgram === "WezTerm") return "WezTerm";
  if (termProgram === "Ghostty") return "Ghostty";
  if (termProgram === "Warp") return "Warp";

  // Check which terminals are installed (in preference order)
  const preferredTerminals: TerminalApp[] = [
    "Warp",
    "iTerm2",
    "Ghostty",
    "WezTerm",
    "Alacritty",
    "Kitty",
    "cmux",
  ];

  for (const terminal of preferredTerminals) {
    if (isTerminalInstalled(terminal)) {
      return terminal;
    }
  }

  // Fallback to Terminal.app (always available on macOS)
  return "Terminal";
}

async function runInWarp(command: string): Promise<void> {
  const escaped = command.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  await runAppleScript(`
    tell application "Warp"
      activate
      tell application "System Events"
        keystroke "n" using command down
      end tell
      delay 0.3
      keystroke "${escaped}"
      keystroke return
    end tell
  `);
}

async function runInITerm2(command: string): Promise<void> {
  const escaped = command.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  await runAppleScript(`
    tell application "iTerm"
      activate
      create window with default profile
      tell current session of current window
        write text "${escaped}"
      end tell
    end tell
  `);
}

async function runInGhostty(command: string): Promise<void> {
  const escaped = command.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  await runAppleScript(`
    tell application "Ghostty"
      activate
      tell application "System Events"
        keystroke "n" using command down
      end tell
      delay 0.3
      keystroke "${escaped}"
      keystroke return
    end tell
  `);
}

async function runInWezTerm(command: string): Promise<void> {
  const escaped = command.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  await runAppleScript(`
    tell application "WezTerm"
      activate
      tell application "System Events"
        keystroke "n" using command down
      end tell
      delay 0.3
      keystroke "${escaped}"
      keystroke return
    end tell
  `);
}

async function runInCmux(command: string): Promise<void> {
  // If cmux session exists, send command to it
  // Otherwise, execute in new cmux environment
  try {
    execFileSync("cmux", ["-e", command], {
      stdio: "ignore",
    });
  } catch {
    // Fallback: try alternative cmux syntax
    try {
      execFileSync("cmux", [command], {
        stdio: "ignore",
      });
    } catch {
      // If cmux fails, fall back to Terminal.app
      return runInTerminal(command);
    }
  }
}

async function runInTerminal(command: string): Promise<void> {
  // Escape backslashes first, then double-quotes — order matters or quotes
  // get double-escaped into AppleScript-invalid \\\".
  const escaped = command.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  await runAppleScript(`
    tell application "Terminal"
      do script "${escaped}"
      activate
    end tell
  `);
}

export async function runCommandInDefaultTerminal(
  command: string,
  preferredTerminal?: string
): Promise<void> {
  const terminal =
    preferredTerminal && preferredTerminal !== "auto"
      ? (preferredTerminal as TerminalApp)
      : detectDefaultTerminal();

  switch (terminal) {
    case "Warp":
      return runInWarp(command);
    case "iTerm2":
      return runInITerm2(command);
    case "Ghostty":
      return runInGhostty(command);
    case "WezTerm":
      return runInWezTerm(command);
    case "cmux":
      return runInCmux(command);
    case "Terminal":
      return runInTerminal(command);
    default:
      return runInTerminal(command);
  }
}

export function executeAndCaptureOutput(command: string): string {
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    }) as string;
    return output.trim();
  } catch (error) {
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "Error: Command execution failed";
  }
}
