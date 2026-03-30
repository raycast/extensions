import { execFile } from "child_process";
import { promisify } from "util";
import type { TerminalAdapter } from "../types";

const execFileAsync = promisify(execFile);

export const alacrittyAdapter: TerminalAdapter = {
  name: "Alacritty",
  bundleId: "org.alacritty",
  async open(command: string): Promise<void> {
    const shell = process.env.SHELL || "/bin/zsh";
    await execFileAsync("open", ["-n", "-a", "Alacritty", "--args", "-e", shell, "-c", command]);
  },
};
