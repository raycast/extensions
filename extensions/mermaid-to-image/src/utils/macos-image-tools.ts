import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { execFile } from "child_process";

const execFilePromise = promisify(execFile);

export async function convertSvgToPngWithQuickLook(inputSvgPath: string, maxEdge: number): Promise<string> {
  await execFilePromise("qlmanage", ["-t", "-s", String(maxEdge), "-o", os.tmpdir(), inputSvgPath]);
  const outputPath = path.join(os.tmpdir(), `${path.basename(inputSvgPath)}.png`);

  if (!fs.existsSync(outputPath)) {
    throw new Error("qlmanage did not produce a PNG output file");
  }

  return outputPath;
}

export async function convertSvgToPngWithSips(
  inputSvgPath: string,
  outputPngPath: string,
  width: number,
  height: number,
): Promise<string> {
  await execFilePromise("sips", [
    "-s",
    "format",
    "png",
    inputSvgPath,
    "--out",
    outputPngPath,
    "--resampleWidth",
    String(width),
    "--resampleHeight",
    String(height),
  ]);

  if (!fs.existsSync(outputPngPath)) {
    throw new Error("sips did not produce a PNG output file");
  }

  return outputPngPath;
}

function escapeForDoubleQuotedAppleScript(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export async function copyRasterImageToClipboard(imagePath: string): Promise<void> {
  const escapedPath = escapeForDoubleQuotedAppleScript(imagePath);
  await execFilePromise("osascript", [
    "-e",
    `set the clipboard to (read (POSIX file "${escapedPath}") as TIFF picture)`,
  ]);
}
