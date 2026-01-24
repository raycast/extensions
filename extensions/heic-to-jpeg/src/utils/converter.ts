import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import path from "path";

const execAsync = promisify(exec);

export interface ConversionResult {
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: string;
}

export async function convertHeicToJpeg(
  inputPath: string,
): Promise<ConversionResult> {
  const dir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(dir, `${baseName}.jpg`);

  try {
    // Check if input file exists
    if (!existsSync(inputPath)) {
      return {
        inputPath,
        outputPath,
        success: false,
        error: "File not found",
      };
    }

    // Check if it's a HEIC file
    const ext = path.extname(inputPath).toLowerCase();
    if (ext !== ".heic" && ext !== ".heif") {
      return {
        inputPath,
        outputPath,
        success: false,
        error: "Not a HEIC/HEIF file",
      };
    }

    // Convert using sips with maximum quality
    await execAsync(
      `sips -s format jpeg -s formatOptions 100 "${inputPath}" --out "${outputPath}"`,
    );

    return {
      inputPath,
      outputPath,
      success: true,
    };
  } catch (error) {
    return {
      inputPath,
      outputPath,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function convertMultipleFiles(
  paths: string[],
): Promise<ConversionResult[]> {
  const results = await Promise.all(paths.map((p) => convertHeicToJpeg(p)));
  return results;
}

export async function getFinderSelection(): Promise<string[]> {
  try {
    const script = `
      tell application "Finder"
        set selectedItems to selection
        set pathList to {}
        repeat with itemRef in selectedItems
          set end of pathList to POSIX path of (itemRef as alias)
        end repeat
        return pathList
      end tell
    `;
    const { stdout } = await execAsync(`osascript -e '${script}'`);

    // Parse the AppleScript list output
    const paths = stdout
      .trim()
      .split(", ")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    return paths;
  } catch {
    return [];
  }
}
