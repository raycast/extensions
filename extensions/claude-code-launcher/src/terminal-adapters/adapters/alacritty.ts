import { execFile } from "child_process";
import { promisify } from "util";
import { TerminalAdapter } from "../types";

const execFileAsync = promisify(execFile);

export class AlacrittyAdapter implements TerminalAdapter {
  name = "Alacritty";
  bundleId = "org.alacritty";

  async open(directory: string): Promise<void> {
    const userShell = process.env.SHELL || "/bin/zsh";

    // Source shell profiles to load environment variables (including API keys)
    // before running claude, since 'open -a' with '-c' skips interactive profile loading
    const command = `source ~/.zprofile 2>/dev/null; source ~/.zshrc 2>/dev/null; source ~/.bash_profile 2>/dev/null; source ~/.bashrc 2>/dev/null; source ~/.profile 2>/dev/null; cd ${this.shellEscape(directory)} && clear && claude ; exec ${userShell} -l`;

    await execFileAsync("open", ["-n", "-a", "Alacritty", "--args", "-e", userShell, "-l", "-i", "-c", command]);
  }

  private shellEscape(str: string): string {
    return `'${str.replace(/'/g, "'\\''")}'`;
  }
}
