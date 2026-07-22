import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isMacPlatform, isWindowsPlatform } from "./platform";

export const DEFAULT_EXPORT_FILE_NAME = "quickshell-workspaces.json";

type DialogKind = "save" | "open";

/**
 * Platform save/open dialogs (Raycast has no native save panel).
 * Returns an absolute path, or null when the user cancels / unsupported.
 */
export function pickWorkspaceTransferJsonPath(kind: DialogKind): string | null {
  if (isWindowsPlatform()) {
    return pickWindowsTransferJsonPath(kind);
  }
  if (isMacPlatform()) {
    return pickMacTransferJsonPath(kind);
  }
  return null;
}

function pickWindowsTransferJsonPath(kind: DialogKind): string | null {
  const script =
    kind === "save"
      ? [
          "Add-Type -AssemblyName System.Windows.Forms",
          "$d = New-Object System.Windows.Forms.SaveFileDialog",
          "$d.Title = 'Export Quick Shell workspaces'",
          "$d.Filter = 'JSON files (*.json)|*.json|All files (*.*)|*.*'",
          `$d.FileName = '${DEFAULT_EXPORT_FILE_NAME}'`,
          "$d.DefaultExt = 'json'",
          "$d.AddExtension = $true",
          "$d.OverwritePrompt = $true",
          "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.FileName) }",
        ].join("; ")
      : [
          "Add-Type -AssemblyName System.Windows.Forms",
          "$d = New-Object System.Windows.Forms.OpenFileDialog",
          "$d.Title = 'Import Quick Shell workspaces'",
          "$d.Filter = 'JSON files (*.json)|*.json|All files (*.*)|*.*'",
          "$d.CheckFileExists = $true",
          "$d.Multiselect = $false",
          "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.FileName) }",
        ].join("; ");

  try {
    const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 120_000,
    });
    const selected = output.trim();
    return selected.length > 0 ? path.resolve(selected) : null;
  } catch {
    return null;
  }
}

/** Exported for unit tests. */
export function buildMacTransferOsascript(kind: DialogKind): string {
  if (kind === "save") {
    return [
      `set defaultName to "${DEFAULT_EXPORT_FILE_NAME}"`,
      'set chosenFile to choose file name with prompt "Export Quick Shell workspaces" default name defaultName',
      "return POSIX path of chosenFile",
    ].join("\n");
  }
  return [
    'set chosenFile to choose file with prompt "Import Quick Shell workspaces" of type {"public.json", "json"}',
    "return POSIX path of chosenFile",
  ].join("\n");
}

function pickMacTransferJsonPath(kind: DialogKind): string | null {
  try {
    const output = execFileSync("osascript", ["-e", buildMacTransferOsascript(kind)], {
      encoding: "utf8",
      timeout: 120_000,
    });
    const selected = output.trim();
    return selected.length > 0 ? path.resolve(selected) : null;
  } catch {
    return null;
  }
}

export function writeWorkspaceExportFile(filePath: string, json: string): void {
  writeFileSync(filePath, json, "utf8");
}

export function readWorkspaceImportFile(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
