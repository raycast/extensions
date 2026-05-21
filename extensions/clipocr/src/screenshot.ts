import { environment } from "@raycast/api";
import util from "util";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

const execFilePromise = util.promisify(execFile);
const SCREENSHOT_CANCELLED_EXIT_CODE = 3;

export class ScreenshotCancelledError extends Error {
  constructor() {
    super("Screenshot capture canceled.");
    this.name = "ScreenshotCancelledError";
  }
}

export function isScreenshotCancelledError(error: unknown): error is ScreenshotCancelledError {
  return error instanceof ScreenshotCancelledError;
}

export default async function takeScreenshot() {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  const filePath = path.join(environment.supportPath, `${Date.now()}.png`);

  try {
    if (process.platform === "win32") {
      await takeWindowsScreenshot(filePath);
    } else {
      throw new Error("ClipOCR only supports Windows screenshots.");
    }
  } catch (e) {
    if (isExitCode(e, SCREENSHOT_CANCELLED_EXIT_CODE)) {
      throw new ScreenshotCancelledError();
    }

    throw e;
  }

  return filePath;
}

function isExitCode(error: unknown, exitCode: number) {
  return typeof error === "object" && error !== null && "code" in error && error.code === exitCode;
}

async function takeWindowsScreenshot(filePath: string) {
  startWindowsScreenSnip();

  const script = `
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;

public static class NativeMethods {
  [DllImport("user32.dll")]
  public static extern uint GetClipboardSequenceNumber();

  [DllImport("user32.dll")]
  public static extern short GetAsyncKeyState(int vKey);
}
"@

function Test-EscapePressed {
  return ([NativeMethods]::GetAsyncKeyState(0x1B) -band 0x8001) -ne 0
}

function Get-ClipboardImagePngBytes {
  try {
    if (-not [System.Windows.Forms.Clipboard]::ContainsImage()) {
      return $null
    }

    $image = [System.Windows.Forms.Clipboard]::GetImage()
    if ($null -eq $image) {
      return $null
    }

    $stream = New-Object System.IO.MemoryStream
    try {
      $image.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
      return $stream.ToArray()
    } finally {
      $stream.Dispose()
      $image.Dispose()
    }
  } catch {
    return $null
  }
}

$outputPath = $env:RAYCAST_OCR_OUTPUT
$timeoutSeconds = 30
if ($env:RAYCAST_OCR_TIMEOUT) {
  $timeoutSeconds = [int]$env:RAYCAST_OCR_TIMEOUT
}

$initialSequenceNumber = [NativeMethods]::GetClipboardSequenceNumber()

$deadline = (Get-Date).AddSeconds($timeoutSeconds)
while ((Get-Date) -lt $deadline) {
  $bytes = Get-ClipboardImagePngBytes
  $sequenceNumber = [NativeMethods]::GetClipboardSequenceNumber()

  if ($null -ne $bytes -and $sequenceNumber -ne $initialSequenceNumber) {
    [System.IO.File]::WriteAllBytes($outputPath, $bytes)
    exit 0
  }

  if (Test-EscapePressed) {
    [Console]::Error.WriteLine("Screen Snip was canceled.")
    exit ${SCREENSHOT_CANCELLED_EXIT_CODE}
  }

  Start-Sleep -Milliseconds 100
}

[Console]::Error.WriteLine("Timed out waiting for a new screenshot in the clipboard. Capture an area after Screen Snip opens.")
exit 2
`;

  const encodedCommand = Buffer.from(script, "utf16le").toString("base64");

  await execFilePromise(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Sta", "-EncodedCommand", encodedCommand],
    {
      env: {
        ...process.env,
        RAYCAST_OCR_OUTPUT: filePath,
        RAYCAST_OCR_TIMEOUT: "30",
      },
      timeout: 35_000,
      windowsHide: true,
    }
  );
}

function startWindowsScreenSnip() {
  execFile("explorer.exe", ["ms-screenclip:"], { windowsHide: true }, () => undefined);
}
