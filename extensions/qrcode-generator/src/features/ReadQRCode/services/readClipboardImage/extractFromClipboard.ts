import { execFile } from "child_process";
import { existsSync, statSync } from "fs";
import { promisify } from "util";
import { safeUnlink, tempPath } from "../tempFiles";

const run = promisify(execFile);

const MAC_SCRIPT = (out: string) => [
  "-e",
  "try",
  "-e",
  `set pngData to (the clipboard as «class PNGf»)`,
  "-e",
  `set fd to open for access POSIX file "${out}" with write permission`,
  "-e",
  "set eof of fd to 0",
  "-e",
  "write pngData to fd",
  "-e",
  "close access fd",
  "-e",
  "on error errMsg",
  "-e",
  'error "NO_IMAGE"',
  "-e",
  "end try",
];

const WIN_SCRIPT = (out: string) =>
  `$ErrorActionPreference='Stop'; $img = Get-Clipboard -Format Image; ` +
  `if ($null -eq $img) { exit 1 }; ` +
  `$img.Save('${out.replace(/'/g, "''")}')`;

export async function extractRawImageFromClipboard(): Promise<string> {
  const out = tempPath("clip", "png");
  if (process.platform === "darwin") {
    await run("osascript", MAC_SCRIPT(out));
  } else if (process.platform === "win32") {
    await run("powershell.exe", ["-Sta", "-NoProfile", "-Command", WIN_SCRIPT(out)]);
  } else {
    throw new Error("Reading raw clipboard image is not supported on this platform");
  }
  if (!existsSync(out) || statSync(out).size === 0) {
    safeUnlink(out);
    throw new Error("No image data in clipboard");
  }
  return out;
}
