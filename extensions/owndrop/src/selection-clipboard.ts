import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { Clipboard, environment } from "@raycast/api";
const run = promisify(execFile);

async function windowsSelection(mode: "select" | "copy" | "select-and-copy", files?: string[]) {
  return run(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-STA",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(environment.assetsPath, "selection-windows.ps1"),
      "-Mode",
      mode,
    ],
    {
      timeout: 20000,
      windowsHide: true,
      env: { ...process.env, OWNDROP_SELECTED_FILES: JSON.stringify(files ?? []) },
    },
  );
}
export async function copySelectedExplorerFiles(): Promise<string[]> {
  let stdout: string;
  try {
    ({ stdout } = await windowsSelection("select-and-copy"));
  } catch {
    throw new Error("Could not read File Explorer selection. Keep Explorer active and retry the hotkey.");
  }
  const files: unknown = JSON.parse(stdout.trim());
  if (!Array.isArray(files) || !files.every((file) => typeof file === "string")) {
    throw new Error("Could not read File Explorer selection");
  }
  return files;
}
export async function copySelectedFiles(files: string[]): Promise<void> {
  if (!files.length) throw new Error("No files selected");
  if (process.platform === "win32") {
    await windowsSelection("copy", files);
    return;
  }
  if (files.length === 1) {
    await Clipboard.copy({ file: files[0] });
    return;
  }
  // Write all NSURLs together; Clipboard.Content.file accepts only one file.
  await run(
    "/usr/bin/osascript",
    ["-l", "JavaScript", path.join(environment.assetsPath, "copy-files-macos.js"), ...files],
    { timeout: 20000 },
  );
}
