import { execFile } from "child_process";
import { promisify } from "util";
import { TerminalAdapter, TerminalOpenOptions } from "../types";

const execFileAsync = promisify(execFile);

/**
 * Ghostty terminal adapter
 *
 * Ghostty is a modern, GPU-accelerated terminal emulator written in Zig
 * by Mitchell Hashimoto. This adapter launches Ghostty with the Claude Code CLI.
 *
 * Documentation: https://ghostty.org/docs/config
 * CLI Reference: https://man.archlinux.org/man/extra/ghostty/ghostty.1.en
 */
export class GhosttyAdapter implements TerminalAdapter {
  name = "Ghostty";
  bundleId = "com.mitchellh.ghostty";

  async open(directory: string, options?: TerminalOpenOptions): Promise<void> {
    const userShell = process.env.SHELL || "/bin/zsh";
    const command = `cd ${this.shellEscape(directory)} && clear && claude ; exec ${userShell} -l`;

    if (options?.ghosttyOpenBehavior === "tab") {
      await this.openInTab(command);
    } else {
      await this.openInNewWindow(userShell, command);
    }
  }

  private async openInNewWindow(shell: string, command: string): Promise<void> {
    // Launch Ghostty using macOS 'open' command
    // -na: open a new instance of the application
    // --args: pass arguments to the application
    // -e: execute command flag for Ghostty
    // -l: login shell
    // -c: command to execute
    await execFileAsync("open", ["-na", "Ghostty.app", "--args", "-e", shell, "-l", "-c", command]);
  }

  private async openInTab(command: string): Promise<void> {
    // Ghostty on macOS has no native AppleScript/IPC for tab creation,
    // so we use GUI scripting via System Events:
    // 1. Set clipboard to the command
    // 2. Activate Ghostty and wait for it to be frontmost
    // 3. Cmd+T to open a new tab
    // 4. Paste command from clipboard and execute
    const script = `
      set the clipboard to ${this.appleScriptEscape(command)}
      tell application "Ghostty" to activate
      repeat until application "Ghostty" is frontmost
        delay 0.1
      end repeat
      tell application "System Events"
        tell process "ghostty"
          keystroke "t" using command down
          delay 0.5
          keystroke "v" using command down
          keystroke return
        end tell
      end tell
    `;

    await execFileAsync("osascript", ["-e", script]);
  }

  private shellEscape(str: string): string {
    return `'${str.replace(/'/g, "'\\''")}'`;
  }

  private appleScriptEscape(str: string): string {
    return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
}
