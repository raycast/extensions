import { exec as execCb } from "child_process";
import { promisify } from "util";
import type { EditorVariant } from "../types";

const exec = promisify(execCb);

// ----------------------------------------------
// EDITOR VARIANT DETECTION
// ----------------------------------------------

export interface EditorInfo {
  variant: EditorVariant;
  name: string;
  command: string;
  icon: string;
}

const EDITORS: EditorInfo[] = [
  {
    variant: "code",
    name: "VS Code",
    command: "code",
    icon: "vscode-icon.png",
  },
  {
    variant: "code-insiders",
    name: "VS Code Insiders",
    command: "code-insiders",
    icon: "vscode-insiders-icon.png",
  },
  {
    variant: "vscodium",
    name: "VSCodium",
    command: "codium",
    icon: "vscodium-icon.png",
  },
  {
    variant: "cursor",
    name: "Cursor",
    command: "cursor",
    icon: "cursor-icon.png",
  },
];

export async function detectInstalledEditors(): Promise<EditorInfo[]> {
  const installed: EditorInfo[] = [];

  for (const editor of EDITORS) {
    try {
      // Try to execute the command with --version
      await exec(`${editor.command} --version`);
      installed.push(editor);
    } catch {
      // Editor not installed or not in PATH
      continue;
    }
  }

  return installed;
}

// ----------------------------------------------
// OPEN WORKSPACE IN EDITOR
// ----------------------------------------------

export async function openWorkspaceInEditor(
  pathToOpen: string,
  variant: EditorVariant = "code",
  newWindow = false,
): Promise<void> {
  const editor = EDITORS.find((e) => e.variant === variant);
  if (!editor) {
    throw new Error(`Unknown editor variant: ${variant}`);
  }

  const command = editor.command;
  const flags = newWindow ? "-n" : "";

  try {
    await exec(`${command} ${flags} "${pathToOpen}"`);
    return;
  } catch {
    // Fallback for macOS if CLI not in PATH
    if (process.platform === "darwin") {
      const appNames: Record<EditorVariant, string> = {
        code: "Visual Studio Code",
        "code-insiders": "Visual Studio Code - Insiders",
        vscodium: "VSCodium",
        cursor: "Cursor",
      };

      const appName = appNames[variant];
      const newWindowFlag = newWindow ? "--args -n" : "--args";
      await exec(`open -a "${appName}" ${newWindowFlag} "${pathToOpen}"`);
      return;
    }

    throw new Error(`Failed to open ${editor.name}. Is it installed and in PATH?`);
  }
}

export function getEditorInfo(variant: EditorVariant): EditorInfo | undefined {
  return EDITORS.find((e) => e.variant === variant);
}
