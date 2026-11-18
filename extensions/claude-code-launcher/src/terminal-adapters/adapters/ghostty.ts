import { execFile } from "child_process";
import { promisify } from "util";
import { TerminalAdapter, TerminalOpenOptions } from "../types";
import { buildClaudeCommand } from "../claude-command";

const execFileAsync = promisify(execFile);

// Ghostty's AppleScript API (new window / new tab / focus) was introduced in 1.3.
const MIN_APPLESCRIPT_VERSION = { major: 1, minor: 3 };

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
    const command = `cd ${this.shellEscape(directory)} && clear && ${buildClaudeCommand(options)} ; exec ${userShell} -l`;
    const asTab = options?.ghosttyOpenBehavior === "tab";

    // Prefer Ghostty's own AppleScript API (1.3+) whenever it is available: it opens
    // windows/tabs inside the already-running instance. The `open -na` window fallback
    // instead spawns a SECOND Ghostty instance that macOS merges with existing
    // (fullscreen) windows into one tabbed window, and the tab fallback is brittle GUI
    // keystroke scripting. Fall back only when scripting is unavailable (Ghostty < 1.3,
    // `macos-applescript = false`, or the app is not running yet).
    if (await this.supportsAppleScript()) {
      try {
        await this.openViaAppleScript(userShell, command, asTab);
        return;
      } catch {
        // Scripting failed at runtime (e.g. disabled) — fall through to legacy paths.
      }
    }

    if (asTab) {
      await this.openTabViaKeystroke(command);
    } else {
      await this.openWindowViaOpen(userShell, command);
    }
  }

  // Whether the running Ghostty exposes its AppleScript API (1.3+). Probing the
  // version is guarded by `is running` so a cold start never launches the app just to
  // check — cold starts use the fallbacks anyway (a fresh window has nothing to merge
  // with, and the keystroke path launches Ghostty itself).
  private async supportsAppleScript(): Promise<boolean> {
    const version = await this.runningVersion();
    if (!version) return false;
    const [major, minor] = version.split(".").map((part) => parseInt(part, 10));
    if (!Number.isFinite(major) || !Number.isFinite(minor)) return false;
    return (
      major > MIN_APPLESCRIPT_VERSION.major ||
      (major === MIN_APPLESCRIPT_VERSION.major && minor >= MIN_APPLESCRIPT_VERSION.minor)
    );
  }

  // Version of the running Ghostty (e.g. "1.3.1"), or undefined when it is not running
  // or scripting is unavailable. The `is running` check comes first so the query never
  // launches the app.
  private async runningVersion(): Promise<string | undefined> {
    const script = `if application "Ghostty" is not running then return ""
return version of application "Ghostty"`;
    try {
      const { stdout } = await execFileAsync("osascript", ["-e", script]);
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  private async openViaAppleScript(shell: string, command: string, asTab: boolean): Promise<void> {
    // Ghostty runs a surface configuration's `command` under /bin/sh with a bare
    // default PATH, so run it through a login shell so `claude` resolves — the same
    // login shell the `open ... ${shell} -l -c` fallback relies on.
    const loginShellCommand = `${shell} -l -c ${this.shellEscape(command)}`;
    const config = `{command:${this.appleScriptEscape(loginShellCommand)}}`;
    // `new tab` must target a window (front window); `new window` creates its own.
    const create = asTab
      ? `set newSurface to new tab in front window with configuration ${config}
          set target to focused terminal of newSurface`
      : `set newSurface to new window with configuration ${config}
          set target to focused terminal of selected tab of newSurface`;
    const script = `
      tell application "Ghostty"
        ${create}
        activate
        try
          focus target
        end try
      end tell
    `;
    await execFileAsync("osascript", ["-e", script]);
  }

  private async openWindowViaOpen(shell: string, command: string): Promise<void> {
    // Fallback for Ghostty < 1.3 / disabled scripting / cold start.
    // -na: new instance, --args: pass to Ghostty, -e: execute, -l login shell, -c command
    await execFileAsync("open", ["-na", "Ghostty.app", "--args", "-e", shell, "-l", "-c", command]);
  }

  private async openTabViaKeystroke(command: string): Promise<void> {
    // Fallback for Ghostty < 1.3 (no `new tab` AppleScript command): drive the GUI.
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
