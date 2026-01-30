import { execFile } from "child_process";
import { promisify } from "util";
import { environment } from "@raycast/api";
import path from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

export async function performOCR(imagePath: string): Promise<string> {
  const swiftScriptPath = path.join(environment.assetsPath, "ocr.swift");

  // We execute the swift script directly.
  // Ensure the script is copied to assets in the build process or run it from source if in dev.
  // In Raycast extensions, bundled assets are usually in environment.assetsPath.
  // For simplicity in development, we will target the source file if assetsPath doesn't work as expected in dev mode,
  // but for a proper build, we should rely on Raycast's asset bundling.

  // Actually, standard way is to compile it or run it via `swift`.
  // `swift` command is available on macOS by default.

  // Note: environment.assetsPath points to the assets folder in the built extension.
  // We need to ensure ocr.swift is treated as an asset.
  // Raycast copies files from ./assets to the build folder.
  // Let's assume we will move the swift file to an assets folder in the root for the build config.

  // For this "simple-ocr" setup without complex build config,
  // let's try to run it from the source location in dev, or relative path.

  // Correction: Raycast requires assets to be in an `assets` folder at the project root
  // and accessed via `environment.assetsPath`.

  let normalizedPath = imagePath;
  if (imagePath.startsWith("file://")) {
    try {
      normalizedPath = fileURLToPath(imagePath);
    } catch (e) {
      normalizedPath = decodeURIComponent(imagePath.replace("file://", ""));
    }
  }

  try {
    const { stdout, stderr } = await execFileAsync("swift", [
      swiftScriptPath,
      normalizedPath,
    ]);
    if (stderr) {
      console.error("OCR Stderr:", stderr);
    }
    return stdout.trim();
  } catch (error) {
    console.error("OCR Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`OCR Failed: ${errorMessage}`);
  }
}
