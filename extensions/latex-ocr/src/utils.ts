import { existsSync, statSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";

// Common paths where pipx/homebrew install executables
const COMMON_PATHS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  `${process.env.HOME}/.local/bin`, // pipx default location
  `${process.env.HOME}/Library/Python/3.11/bin`,
  `${process.env.HOME}/Library/Python/3.12/bin`,
  `${process.env.HOME}/Library/Python/3.10/bin`,
  "/usr/bin",
];

// Promisify exec for async/await usage
export const execAsync = promisify(exec);

/**
 * Simple logger with timestamps
 */
export function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split("T")[1];
  if (data !== undefined) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

/**
 * Take an interactive screenshot using macOS screencapture
 * Returns the path to the temporary screenshot file, or null if cancelled
 */
export function takeScreenshot(): Promise<string | null> {
  const tempFile = join(tmpdir(), `latex-ocr-${Date.now()}.png`);
  log("Starting screenshot capture", { tempFile });

  return new Promise((resolve) => {
    // Use full path to screencapture, -i for interactive, -x for no sound
    exec(`/usr/sbin/screencapture -i -x "${tempFile}"`, (error, stdout, stderr) => {
      log("Screenshot exec completed", { error: error?.message, stdout, stderr });

      if (error) {
        log("Screenshot error", error);
        resolve(null);
        return;
      }

      if (!existsSync(tempFile)) {
        log("Screenshot file not created (user cancelled)");
        resolve(null);
        return;
      }

      const stats = statSync(tempFile);
      log("Screenshot saved", { size: stats.size, path: tempFile });
      resolve(tempFile);
    });
  });
}

/**
 * Clean up temporary screenshot file
 */
export function cleanupScreenshot(filePath: string) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch (e) {
    log("Failed to cleanup screenshot", e);
  }
}

/**
 * Get PATH with common binary locations included
 */
function getEnhancedPath(): string {
  const currentPath = process.env.PATH || "";
  const additionalPaths = COMMON_PATHS.filter((p) => !currentPath.includes(p)).join(":");
  return `${additionalPaths}:${currentPath}`;
}

/**
 * Find pix2tex executable in PATH
 */
export async function findPix2tex(): Promise<string | null> {
  log("Searching for pix2tex...");
  const enhancedPath = getEnhancedPath();

  try {
    // Try to find pix2tex using 'which' with enhanced PATH
    const { stdout } = await execAsync("which pix2tex", {
      timeout: 5000,
      env: { ...process.env, PATH: enhancedPath },
    });
    const path = stdout.trim();
    if (path && existsSync(path)) {
      log("Found pix2tex via 'which'", { path });
      return path;
    }
  } catch (e) {
    log("'which pix2tex' failed, trying common locations...", e);
  }

  // Check common locations manually
  for (const dir of COMMON_PATHS) {
    const pix2texPath = join(dir, "pix2tex");
    if (existsSync(pix2texPath)) {
      log("Found pix2tex in common location", { path: pix2texPath });
      return pix2texPath;
    }
  }

  log("pix2tex not found anywhere");
  return null;
}

/**
 * Run pix2tex CLI on an image file
 */
export async function runPix2tex(imagePath: string, pix2texPath: string): Promise<string> {
  const command = `"${pix2texPath}" "${imagePath}"`;
  log("Running pix2tex", { command });

  const startTime = Date.now();

  try {
    // pix2tex CLI: pass the image path directly
    // It outputs the LaTeX to stdout
    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000, // 120 second timeout for model loading + inference
      maxBuffer: 1024 * 1024, // 1MB buffer
      env: { ...process.env, PATH: getEnhancedPath() },
    });

    const elapsed = Date.now() - startTime;
    log("pix2tex completed", { elapsed: `${elapsed}ms`, stdout, stderr: stderr?.substring(0, 200) });

    // pix2tex may output progress/loading info to stderr, that's OK
    // We only care about stdout which contains the LaTeX

    const result = stdout.trim();

    if (!result) {
      // Check if there was an actual error in stderr
      if (stderr && (stderr.includes("Error") || stderr.includes("Exception"))) {
        log("pix2tex returned error in stderr", { stderr });
        throw new Error(stderr.split("\n")[0]);
      }
      log("pix2tex returned empty result");
      return "";
    }

    log("pix2tex result", { result });
    return result;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log("pix2tex failed", { elapsed: `${elapsed}ms`, error });

    if (error instanceof Error) {
      // Check for common errors
      if (error.message.includes("ENOENT")) {
        throw new Error("pix2tex not found. Install with: pipx install pix2tex");
      }
      if (error.message.includes("ETIMEDOUT") || error.message.includes("timeout")) {
        throw new Error("OCR timed out after 120s. Try a smaller image.");
      }
      throw error;
    }
    throw new Error("Unknown error running pix2tex");
  }
}
