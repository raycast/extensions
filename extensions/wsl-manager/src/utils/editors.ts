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
      command: "antigravity",
      args: [path],
    }),
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
    // For notepad we need to convert path first, which is complex with execFile alone if piping
    // But we can run wslpath separately in the caller or here?
    // Let's assume the caller handles wslpath conversion if we return a special flag or we do two steps.
    // However, to keep it simple and secure, we can use 'wsl' to run wslpath, capture output, then run notepad.
    // BUT 'getCommand' is synchronous.
    // We will change getCommand to return just the args for the final command,
    // and assume the caller might need to do path conversion?
    // Actually, for Notepad/Notepad++, we need the Windows path.
    // Let's make getCommand async? No, that complicates things.
    // Let's use a composite command via PowerShell (Start-Process) or keep the pipe logic BUT
    // we can't use pipe with execFile easily.
    // Safer approach: Caller (open-project) should convert path if needed.
    // But 'open-project' doesn't know if the editor needs a Windows path.
    // Let's stick to the previous implementation for now but use a safer construction?
    // No, we must eliminate shell = true.
    // We will use "wsl" to run "wslpath" inside the editor logic?
    // Use 'wsl -d distro wslpath -w path' to get the path.
    // Then 'notepad path'.
    // We will verify this in 'src/open-project.ts'.
    // For now, let's keep the structure but maybe mark these as needing windows path?
    // Let's add 'needsWindowsPath' to Editor interface.
    getCommand: (distro, path) => ({
      command: "notepad.exe",
      args: [path], // This expects a windows path!
    }),
    needsWindowsPath: true, // Custom property we'll add
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
    const found = stdout.toLowerCase();

    if (found.includes("code")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "vscode")!);
    if (found.includes("cursor")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "cursor")!);
    if (found.includes("antigravity")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "antigravity")!);
    if (found.includes("notepad")) detectedEditors.push(COMMON_EDITORS.find((e) => e.id === "notepad")!);
  } catch {
    // Ignore errors, some might be missing
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
