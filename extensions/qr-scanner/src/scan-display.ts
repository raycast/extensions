import {
  Clipboard,
  closeMainWindow,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const execFileAsync = promisify(execFile);
const SCREENSHOT_DELAY_MS = 250;

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Scanning display...",
  });

  const tempDirectory = await mkdtemp(join(tmpdir(), "raycast-qr-"));
  const screenshotPath = join(tempDirectory, "display.png");

  try {
    await closeMainWindow({ clearRootSearch: true });
    await wait(SCREENSHOT_DELAY_MS);
    await captureDisplay(screenshotPath);

    const qrContent = await decodeQrFromPng(screenshotPath);
    if (!qrContent) {
      toast.style = Toast.Style.Failure;
      toast.title = "No QR code found";
      toast.message = "Use Scan Multiple QR Codes for a deeper scan.";
      return;
    }

    await Clipboard.copy(qrContent);
    await showHUD("Copied QR code contents to clipboard");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not scan display";
    toast.message = error instanceof Error ? error.message : String(error);
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

async function captureDisplay(outputPath: string) {
  switch (process.platform) {
    case "darwin":
      await execFileAsync("screencapture", ["-x", outputPath]);
      return;
    case "win32":
      await captureWindowsDisplay(outputPath);
      return;
    default:
      throw new Error("This command currently supports macOS and Windows.");
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function captureWindowsDisplay(outputPath: string) {
  const escapedOutputPath = outputPath.replaceAll("'", "''");
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screens = [System.Windows.Forms.Screen]::AllScreens
$left = ($screens | ForEach-Object { $_.Bounds.Left } | Measure-Object -Minimum).Minimum
$top = ($screens | ForEach-Object { $_.Bounds.Top } | Measure-Object -Minimum).Minimum
$right = ($screens | ForEach-Object { $_.Bounds.Right } | Measure-Object -Maximum).Maximum
$bottom = ($screens | ForEach-Object { $_.Bounds.Bottom } | Measure-Object -Maximum).Maximum
$width = $right - $left
$height = $bottom - $top

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($left, $top, 0, 0, $bitmap.Size)
$bitmap.Save('${escapedOutputPath}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`;

  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ]);
}

async function decodeQrFromPng(path: string) {
  const pngBuffer = await readFile(path);
  const image = PNG.sync.read(pngBuffer);
  const clampedData = new Uint8ClampedArray(
    image.data.buffer,
    image.data.byteOffset,
    image.data.byteLength,
  );
  const result = jsQR(clampedData, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });

  return result?.data;
}
