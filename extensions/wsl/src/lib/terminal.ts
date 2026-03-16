import { execFile, execFileSync } from "child_process";

export function openInWindowsTerminal(distro?: string, command?: string): void {
  let file: string;
  let args: string[];

  if (distro && !command) {
    // Open WT with a WSL profile matching the distro name
    file = "wt.exe";
    args = ["-p", distro];
  } else if (distro && command) {
    // Open WT running a specific WSL command
    file = "wt.exe";
    args = ["wsl.exe", "-d", distro, "--", "bash", "-ic", `${command}; exec bash`];
  } else if (command) {
    file = "wt.exe";
    args = ["wsl.exe", "--", "bash", "-ic", `${command}; exec bash`];
  } else {
    // Just open WT with default WSL
    file = "wt.exe";
    args = ["wsl.exe"];
  }

  const child = execFile(file, args, { windowsHide: false });
  child.unref();
}

export function isWindowsTerminalInstalled(): boolean {
  try {
    execFileSync("where", ["wt.exe"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
