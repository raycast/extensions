import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

/**
 * Extract text from image using Tesseract OCR
 */
export async function extractTextFromImage(imagePath: string): Promise<string> {
  console.log(`[extractTextFromImage] Processing: ${imagePath}`);

  // For sandboxed files, copy to temp location
  let workingPath = imagePath;
  let tempPath: string | null = null;

  if (imagePath.includes("/Containers/")) {
    try {
      const tempDir = os.tmpdir();
      const fileName = path.basename(imagePath);
      tempPath = path.join(tempDir, `raycast-img-${Date.now()}-${fileName}`);

      console.log(`[extractTextFromImage] Copying to temp: ${tempPath}`);
      await fs.copyFile(imagePath, tempPath);
      workingPath = tempPath;
    } catch (copyError) {
      console.warn(`[extractTextFromImage] Copy failed:`, copyError);
    }
  }

  try {
    // Use Python with pytesseract for OCR
    const pythonScript = `
import sys
import os

try:
    import pytesseract
    from PIL import Image
except ImportError as e:
    print(f"Missing package: {e}", file=sys.stderr)
    sys.exit(1)

try:
    img = Image.open("${workingPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")
    text = pytesseract.image_to_string(img)
    
    if not text.strip():
        print("No text recognized via OCR", file=sys.stderr)
        sys.exit(1)
    
    print(text)
except Exception as e:
    print(f"OCR Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

    console.log(`[extractTextFromImage] Running OCR...`);

    const { stdout, stderr } = await execAsync(
      `python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`,
      {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000,
      },
    );

    if (stderr && stderr.includes("Error")) {
      throw new Error(`OCR failed: ${stderr}`);
    }

    if (!stdout || stdout.trim().length === 0) {
      throw new Error("No text recognized via OCR");
    }

    let text = stdout.trim();

    // Truncate if too long
    if (text.length > 50000) {
      console.log(
        `[extractTextFromImage] Truncating from ${text.length} to 50000 chars`,
      );
      text = text.substring(0, 50000) + "\n\n[... truncated ...]";
    }

    console.log(
      `[extractTextFromImage] ✓ Extracted ${text.length} chars via OCR`,
    );
    return text;
  } catch (error) {
    console.error(`[extractTextFromImage] Failed:`, error);
    throw new Error(
      "Failed to extract text from image. Make sure Tesseract is installed for OCR support.",
    );
  } finally {
    // Clean up temp file
    if (tempPath) {
      try {
        await fs.unlink(tempPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Extract text from multiple images
 */
export async function extractTextFromMultipleImages(
  imagePaths: string[],
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const path of imagePaths) {
    try {
      const text = await extractTextFromImage(path);
      results.set(path, text);
    } catch (error) {
      console.error(
        `[extractTextFromMultipleImages] Failed for ${path}:`,
        error,
      );
      results.set(
        path,
        `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return results;
}
