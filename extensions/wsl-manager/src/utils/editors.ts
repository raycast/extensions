import { execFileAsync } from "./wsl";

export interface Editor {
  name: string;
  id: string;
  isTerminal: boolean;
  getCommand: (distro: string, path: string) => { command: string; args: string[] };
  icon?: string;
}

const COMMON_EDITORS: Editor[] = [
  {
    name: "VS Code",
    id: "vscode",
    isTerminal: false,
    getCommand: (distro, path) => ({
      command: "code",
      args: ["--remote", `wsl+${distro}`, path],
    }),
    icon: "vscode-icon.png",
  },
  {
    name: "Antigravity",
    id: "antigravity",
    isTerminal: false,
    getCommand: (distro, path) => ({
      command: "cmd.exe",
      args: ["/c", "antigravity", path],
    }),
    needsWindowsPath: true,
  },
  {
    name: "Cursor",
    id: "cursor",
    isTerminal: false,
    getCommand: (distro, path) => ({
      command: "cursor",
      args: ["--remote", `wsl+${distro}`, path],
    }),
  },
  {
    name: "Notepad",
    id: "notepad",
    isTerminal: false,
    getCommand: (distro, path) => ({
      command: "notepad.exe",
      args: [path], // This expects a windows path!
    }),
    needsWindowsPath: true,
  },
  {
    name: "Notepad++",
    id: "notepadplusplus",
    isTerminal: false,
    getCommand: (distro, path) => ({
      command: "C:\\Program Files\\Notepad++\\notepad++.exe",
      args: [path],
    }),
    needsWindowsPath: true,
  },
  {
    name: "Vim",
    id: "vim",
    isTerminal: true,
    getCommand: (distro, path) => ({
      command: "wsl",
      args: ["-d", distro, "vim", path],
    }),
    useTerminal: true, // Helper to know we should launch in terminal
  },
  {
    name: "Nano",
    id: "nano",
    isTerminal: true,
    getCommand: (distro, path) => ({
      command: "wsl",
      args: ["-d", distro, "nano", path],
    }),
    useTerminal: true,
  },
  {
    name: "Micro",
    id: "micro",
    isTerminal: true,
    getCommand: (distro, path) => ({
      command: "wsl",
      args: ["-d", distro, "micro", path],
    }),
    useTerminal: true,
  },
] as (Editor & { needsWindowsPath?: boolean; useTerminal?: boolean })[];

export async function getConfiguredEditors(distro: string): Promise<Editor[]> {
  // We will check which of these actually exist

  // 1. Check Windows-side editors (VS Code, Cursor, Antigravity)
  // We can use 'where.exe' in Windows
  const detectedEditors: Editor[] = [];

  try {
    const { stdout } = await execFileAsync("where.exe", ["code", "cursor", "antigravity", "notepad"]);
    const foundLines = stdout.toLowerCase().split(/\r?\n/);

    // Helper to check if any line ends with the executable name
    // where.exe returns full paths like C:\...\bin\code.cmd
    const hasEditor = (name: string) =>
      foundLines.some((line) => {
        const fileName = line.split("\\").pop();
        if (!fileName) return false;
        // Check for exact name or name with typical extensions
        return (
          fileName === name || fileName === `${name}.exe` || fileName === `${name}.cmd` || fileName === `${name}.bat`
        );
      });

    if (hasEditor("code")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "vscode")!);
    if (hasEditor("cursor")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "cursor")!);
    if (hasEditor("antigravity")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "antigravity")!);

    // Notepad usually is just notepad.exe in System32
    if (hasEditor("notepad")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "notepad")!);
  } catch {
    // Ignore errors that happen if none are found or command fails
  }

  // 2. Check WSL-side editors (vim, nano, micro)
  try {
    const { stdout } = await execFileAsync("wsl", ["-d", distro, "bash", "-c", "type vim nano micro"]);
    const foundWsl = stdout.toLowerCase();

    if (foundWsl.includes("vim is")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "vim")!);
    if (foundWsl.includes("nano is")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "nano")!);
    if (foundWsl.includes("micro is")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "micro")!);
  } catch {
    // check individual if 'type' fails as a block
  }

  // Always fallback to VS Code and Notepad if detection fails completely (safe defaults)
  if (detectedEditors.length === 0) {
    return [COMMON_EDITORS[0], COMMON_EDITORS[3]];
  }

  return detectedEditors;
}
