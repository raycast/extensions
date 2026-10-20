import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function copyImage(file: string) {
  if (process.platform === "darwin") {
    await execFileAsync(
      "/usr/bin/osascript",
      [
        "-e",
        ["on run argv", "set the clipboard to (read (POSIX file (item 1 of argv)) as «class PNGf»)", "end run"].join(
          "\n",
        ),
        file,
      ],
      { timeout: 10_000 },
    );
  } else if (process.platform === "win32") {
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-STA",
        "-Command",
        [
          "$ErrorActionPreference = 'Stop'",
          "Add-Type -AssemblyName System.Windows.Forms",
          "Add-Type -AssemblyName System.Drawing",
          "$image = [System.Drawing.Image]::FromFile($env:PELE_IMAGE_PATH)",
          "try { [System.Windows.Forms.Clipboard]::SetImage($image) } finally { $image.Dispose() }",
        ].join("\n"),
      ],
      { env: { ...process.env, PELE_IMAGE_PATH: file }, timeout: 10_000 },
    );
  } else {
    throw new Error("Image copying is supported on macOS and Windows.");
  }
}
