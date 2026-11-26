import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runAppleScript } from "@raycast/utils";
import { TerminalApp } from "../types";
import { execCommand } from "./env";

const TERMINAL_SCRIPT = `
on run argv
  set cmd to item 1 of argv
  tell application "Terminal"
    activate
    do script cmd
  end tell
end run
`;

const ITERM_SCRIPT = `
on run argv
  set cmd to item 1 of argv
  tell application "iTerm"
    activate
    if (count of windows) = 0 then
      create window with default profile
    else
      tell current window to create tab with default profile
    end if
    tell current session of current window to write text cmd
  end tell
end run
`;

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function buildShellCommandLine(bin: string, args: string[]): string {
  return [shellQuote(bin), ...args.map(shellQuote)].join(" ");
}

export async function runCommandInTerminal(
  projectPath: string,
  command: { bin: string; args: string[]; display?: string },
  terminal: TerminalApp = "Terminal",
): Promise<{ launched: boolean; error?: string }> {
  const safeExecLine = buildShellCommandLine(command.bin, command.args);
  const displayLabel = command.display ?? [command.bin, ...command.args].join(" ");
  const fullCmd = `cd ${shellQuote(projectPath)} && ${safeExecLine}`;

  if (terminal === "Terminal") {
    try {
      await runAppleScript(TERMINAL_SCRIPT, [fullCmd], { timeout: 10_000 });
      return { launched: true };
    } catch (error) {
      return { launched: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  if (terminal === "iTerm") {
    try {
      await runAppleScript(ITERM_SCRIPT, [fullCmd], { timeout: 10_000 });
      return { launched: true };
    } catch (error) {
      return { launched: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // For Warp, Ghostty, Alacritty, Kitty: create a self-cleaning .command launcher script
  // using single-quoted argv so no shell interpolation occurs.
  const tmpScript = path.join(os.tmpdir(), `packdeck-run-${crypto.randomUUID()}.command`);
  const scriptContent = [
    "#!/bin/zsh",
    'rm -f -- "$0"',
    `cd ${shellQuote(projectPath)} || exit 1`,
    `printf '\\033[1;36m▶ Packdeck:\\033[0m %s\\n' ${shellQuote(displayLabel)}`,
    safeExecLine,
    'exec "$SHELL" -l',
  ].join("\n");

  fs.writeFileSync(tmpScript, `${scriptContent}\n`, { mode: 0o700 });

  const appNameMap: Record<Exclude<TerminalApp, "Terminal" | "iTerm">, string> = {
    Warp: "Warp",
    Ghostty: "Ghostty",
    Alacritty: "Alacritty",
    Kitty: "kitty",
  };

  const res = await execCommand("/usr/bin/open", ["-a", appNameMap[terminal], tmpScript], { timeoutMs: 10_000 });
  if (res.exitCode !== 0) {
    try {
      fs.unlinkSync(tmpScript);
    } catch {
      // ignore cleanup error
    }
    return runCommandInTerminal(projectPath, command, "Terminal");
  }
  return { launched: true };
}
