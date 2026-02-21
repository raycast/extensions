import { execFile } from "child_process";
import { promisify } from "util";
import { TerminalAdapter } from "../types";

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

  async open(directory: string): Promise<void> {
    const userShell = process.env.SHELL || "/bin/zsh";

    // Build the command to execute in the terminal
    // 1. Source shell profiles to load environment variables (including API key)
    // 2. cd to the target directory
    // 3. clear the screen for a clean start
    // 4. launch claude CLI
    // 5. exec the shell to replace the process
    const command = `source ~/.zprofile 2>/dev/null; source ~/.zshrc 2>/dev/null; source ~/.bash_profile 2>/dev/null; source ~/.bashrc 2>/dev/null; source ~/.profile 2>/dev/null; cd ${this.shellEscape(directory)} && clear && claude ; exec ${userShell} -l`;

    // Launch Ghostty using macOS 'open' command
    // -na: open a new instance of the application
    // --args: pass arguments to the application
    // -e: execute command flag for Ghostty
    // -l: login shell
    // -c: command to execute
    await execFileAsync("open", ["-na", "Ghostty.app", "--args", "-e", userShell, "-l", "-c", command]);
  }

  /**
   * Escape shell special characters to prevent command injection
   * Wraps the string in single quotes and escapes any existing single quotes
   */
  private shellEscape(str: string): string {
    return `'${str.replace(/'/g, "'\\''")}'`;
  }
}
