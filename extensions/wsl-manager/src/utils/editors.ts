import { execAsync } from "./wsl";

export interface Editor {
  name: string;
  id: string;
  isTerminal: boolean;
  commandTemplate: string; // {distro} and {path} placeholders
  icon?: string;
}

const COMMON_EDITORS: Editor[] = [
  {
    name: "VS Code",
    id: "vscode",
    isTerminal: false,
    commandTemplate: 'code --remote wsl+{distro} "{path}"',
    icon: "vscode-icon.png", // Assuming valid icon or fallback
  },
  {
    name: "Antigravity", // User requested
    id: "antigravity",
    isTerminal: false,
    // Assuming "antigravity" binary exists, otherwise fallback to cursor/vscode logic if it's an alias
    commandTemplate: 'antigravity "{path}"',
  },
  {
    name: "Cursor",
    id: "cursor",
    isTerminal: false,
    commandTemplate: 'cursor --remote wsl+{distro} "{path}"',
  },
  {
    name: "Notepad",
    id: "notepad",
    isTerminal: false,
    // wslpath -w is needed for windows apps
    commandTemplate: 'wsl -d {distro} wslpath -w "{path}" | xargs -I {} notepad.exe "{}"',
  },
  {
    name: "Notepad++",
    id: "notepadplusplus",
    isTerminal: false,
    commandTemplate:
      'wsl -d {distro} wslpath -w "{path}" | xargs -I {} "C:\\Program Files\\Notepad++\\notepad++.exe" "{}"',
  },
  {
    name: "Vim",
    id: "vim",
    isTerminal: true,
    commandTemplate: 'start wsl -d {distro} vim "{path}"',
  },
  {
    name: "Nano",
    id: "nano",
    isTerminal: true,
    commandTemplate: 'start wsl -d {distro} nano "{path}"',
  },
  {
    name: "Micro",
    id: "micro",
    isTerminal: true,
    commandTemplate: 'start wsl -d {distro} micro "{path}"',
  },
];

export async function getConfiguredEditors(distro: string): Promise<Editor[]> {
  // We will check which of these actually exist

  // 1. Check Windows-side editors (VS Code, Cursor, Antigravity)
  // We can use 'where.exe' in Windows
  const detectedEditors: Editor[] = [];

  try {
    const { stdout } = await execAsync("where.exe code cursor antigravity notepad");
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
    const { stdout } = await execAsync(`wsl -d ${distro} bash -c "type vim nano micro"`);
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
