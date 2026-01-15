import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Extract text from PDF using Python's pdfplumber
 */
async function extractWithPdfplumber(pdfPath: string): Promise<string> {
  const escapedPath = pdfPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const pythonScript = `
import sys
try:
    import pdfplumber
except ImportError:
    print("pdfplumber not installed", file=sys.stderr)
    sys.exit(1)

try:
    with pdfplumber.open("${escapedPath}") as pdf:
        text = ""
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\\n"
        if not text.strip():
            print("No text extracted from PDF", file=sys.stderr)
            sys.exit(1)
        print(text)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

  const { stdout, stderr } = await promisify(exec)(
    `python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`,
    {
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (stderr && stderr.includes("No text extracted")) {
    throw new Error("No text in PDF - may be image-based");
  }

  if (!stdout || stdout.trim().length === 0) {
    throw new Error("No text extracted");
  }

  return stdout.trim();
}

/**
 * Extract text from image-based PDF using OCR (Tesseract)
 * Uses pdftoppm directly to avoid PATH issues
 */
async function extractWithOCR(pdfPath: string): Promise<string> {
  const escapedPath = pdfPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const pythonScript = `
import sys
import os
import tempfile
import subprocess
from pathlib import Path

try:
    import pytesseract
    from PIL import Image
except ImportError as e:
    print(f"Missing package: {e}", file=sys.stderr)
    sys.exit(1)

# Configure tesseract path for Homebrew installations
tesseract_paths = [
    "/opt/homebrew/bin/tesseract",  # Homebrew on Apple Silicon
    "/usr/local/bin/tesseract",     # Homebrew on Intel
    "/usr/bin/tesseract",           # System default
]

for tess_path in tesseract_paths:
    if os.path.exists(tess_path):
        pytesseract.pytesseract.tesseract_cmd = tess_path
        break

try:
    # Create temp directory for images
    with tempfile.TemporaryDirectory() as tmpdir:
        # Convert PDF to images using pdftoppm
        pdf_path = "${escapedPath}"
        output_prefix = os.path.join(tmpdir, "page")

        # Find pdftoppm in common locations
        pdftoppm_paths = [
            "/opt/homebrew/bin/pdftoppm",  # Homebrew on Apple Silicon
            "/usr/local/bin/pdftoppm",     # Homebrew on Intel
            "/usr/bin/pdftoppm",           # System default
            "pdftoppm"                     # Try PATH
        ]

        pdftoppm_cmd = None
        for path in pdftoppm_paths:
            if os.path.exists(path) or path == "pdftoppm":
                pdftoppm_cmd = path
                break

        if not pdftoppm_cmd:
            print("pdftoppm not found. Install with: brew install poppler", file=sys.stderr)
            sys.exit(1)

        # Run pdftoppm to convert PDF pages to images
        result = subprocess.run(
            [pdftoppm_cmd, "-png", pdf_path, output_prefix],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"pdftoppm error: {result.stderr}", file=sys.stderr)
            sys.exit(1)
        
        # Get all generated image files
        image_files = sorted(Path(tmpdir).glob("page-*.png"))
        
        if not image_files:
            print("No images generated from PDF", file=sys.stderr)
            sys.exit(1)
        
        # OCR each image
        text = ""
        for img_path in image_files:
            img = Image.open(img_path)
            page_text = pytesseract.image_to_string(img)
            if page_text.strip():
                text += page_text + "\\n"
        
        if not text.strip():
            print("No text recognized via OCR", file=sys.stderr)
            sys.exit(1)
        
        print(text)
except Exception as e:
    print(f"OCR Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

  console.log(`[extractWithOCR] Running OCR on PDF...`);

  const { stdout, stderr } = await promisify(exec)(
    `python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`,
    {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000, // OCR can take a while
    },
  );

  if (stderr && stderr.includes("Error")) {
    throw new Error(`OCR failed: ${stderr}`);
  }

  if (!stdout || stdout.trim().length === 0) {
    throw new Error("No text recognized via OCR");
  }

  return stdout.trim();
}

/**
 * Extract text from PDF using multiple methods
 */
export async function extractTextFromPDF(pdfPath: string): Promise<string> {
  console.log(`[extractTextFromPDF] Processing: ${pdfPath}`);

  // For sandboxed files, copy to temp location
  let workingPath = pdfPath;
  let tempPath: string | null = null;

  if (pdfPath.includes("/Containers/")) {
    try {
      const tempDir = os.tmpdir();
      const fileName = path.basename(pdfPath);
      tempPath = path.join(tempDir, `raycast-pdf-${Date.now()}-${fileName}`);

      console.log(`[extractTextFromPDF] Copying to temp: ${tempPath}`);
      await fs.copyFile(pdfPath, tempPath);
      workingPath = tempPath;
    } catch (copyError) {
      console.warn(`[extractTextFromPDF] Copy failed:`, copyError);
    }
  }

  try {
    // Try pdfplumber first (fast for text-based PDFs)
    try {
      console.log(`[extractTextFromPDF] Trying pdfplumber...`);
      let text = await extractWithPdfplumber(workingPath);

      // Truncate if too long
      if (text.length > 50000) {
        console.log(
          `[extractTextFromPDF] Truncating from ${text.length} to 50000 chars`,
        );
        text = text.substring(0, 50000) + "\n\n[... truncated ...]";
      }

      console.log(
        `[extractTextFromPDF] ✓ Extracted ${text.length} chars via pdfplumber`,
      );
      return text;
    } catch (pdfplumberError) {
      console.warn(`[extractTextFromPDF] pdfplumber failed, trying OCR...`);

      // Fallback to OCR for image-based PDFs
      let text = await extractWithOCR(workingPath);

      // Truncate if too long
      if (text.length > 50000) {
        console.log(
          `[extractTextFromPDF] Truncating from ${text.length} to 50000 chars`,
        );
        text = text.substring(0, 50000) + "\n\n[... truncated ...]";
      }

      console.log(
        `[extractTextFromPDF] ✓ Extracted ${text.length} chars via OCR`,
      );
      return text;
    }
  } catch (error) {
    console.error(`[extractTextFromPDF] All methods failed:`, error);
    throw new Error(
      "Failed to extract text from PDF. Make sure Tesseract is installed for OCR support.",
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
 * Extract text from multiple PDF files
 */
export async function extractTextFromMultiplePDFs(
  pdfPaths: string[],
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const path of pdfPaths) {
    try {
      const text = await extractTextFromPDF(path);
      results.set(path, text);
    } catch (error) {
      console.error(`[extractTextFromMultiplePDFs] Failed for ${path}:`, error);
      results.set(
        path,
        `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return results;
}

/**
 * Convert PDF to base64 string for direct API submission
 */
export async function pdfToBase64(pdfPath: string): Promise<string> {
  console.log(`[pdfToBase64] Converting: ${pdfPath}`);

  // For sandboxed files, copy to temp location
  let workingPath = pdfPath;
  let tempPath: string | null = null;

  if (pdfPath.includes("/Containers/")) {
    try {
      const tempDir = os.tmpdir();
      const fileName = path.basename(pdfPath);
      tempPath = path.join(tempDir, `raycast-pdf-${Date.now()}-${fileName}`);

      console.log(`[pdfToBase64] Copying to temp: ${tempPath}`);
      await fs.copyFile(pdfPath, tempPath);
      workingPath = tempPath;
    } catch (copyError) {
      console.warn(`[pdfToBase64] Copy failed:`, copyError);
    }
  }

  try {
    const fileBuffer = await fs.readFile(workingPath);
    const base64 = fileBuffer.toString("base64");
    console.log(
      `[pdfToBase64] ✓ Converted ${fileBuffer.length} bytes to base64`,
    );
    return base64;
  } catch (error) {
    console.error(`[pdfToBase64] Failed:`, error);
    throw new Error(
      `Failed to convert PDF to base64: ${error instanceof Error ? error.message : "Unknown error"}`,
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
 * Get PDF file size in bytes
 */
export async function getPDFSize(pdfPath: string): Promise<number> {
  try {
    const stats = await fs.stat(pdfPath);
    return stats.size;
  } catch (error) {
    console.error(`[getPDFSize] Failed:`, error);
    return 0;
  }
}
