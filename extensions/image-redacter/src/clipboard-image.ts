import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { Clipboard } from "@raycast/api";
import { clipboardFilePath } from "./source-file";

const execFileAsync = promisify(execFile);

export type ClipboardImage = {
  path: string;
  cleanup?: () => Promise<void>;
};

export async function readClipboardImage(): Promise<ClipboardImage> {
  const clipboard = await Clipboard.read();
  if (clipboard.file) return { path: clipboardFilePath(clipboard.file) };

  const directory = await mkdtemp(join(tmpdir(), "image-redacter-"));
  const path = join(directory, "clipboard.png");

  try {
    if (process.platform === "darwin") await extractMacOSClipboardImage(path);
    else if (process.platform === "win32")
      await extractWindowsClipboardImage(path);
    else throw new Error("Unsupported platform");
  } catch {
    await rm(directory, { recursive: true, force: true });
    throw new Error("Copy an image or image file to the clipboard first.");
  }

  return {
    path,
    cleanup: () => rm(dirname(path), { recursive: true, force: true }),
  };
}

async function extractMacOSClipboardImage(path: string): Promise<void> {
  const script = `
set outputPath to system attribute "IMAGE_REDACTER_CLIPBOARD_PATH"
set imageData to the clipboard as «class PNGf»
set fileReference to open for access POSIX file outputPath with write permission
try
  set eof fileReference to 0
  write imageData to fileReference
  close access fileReference
on error errorMessage
  try
    close access fileReference
  end try
  error errorMessage
end try
`;
  await execFileAsync("/usr/bin/osascript", ["-e", script], {
    env: { ...process.env, IMAGE_REDACTER_CLIPBOARD_PATH: path },
    timeout: 10_000,
  });
}

async function extractWindowsClipboardImage(path: string): Promise<void> {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$image = [System.Windows.Forms.Clipboard]::GetImage()
if ($null -eq $image) { exit 1 }
try {
  $image.Save($env:IMAGE_REDACTER_CLIPBOARD_PATH, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $image.Dispose()
}
`;
  await execFileAsync(
    "powershell.exe",
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-STA",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
    ],
    {
      env: { ...process.env, IMAGE_REDACTER_CLIPBOARD_PATH: path },
      timeout: 10_000,
    },
  );
}
