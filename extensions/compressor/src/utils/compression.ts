import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { environment } from "@raycast/api";

const execFileAsync = promisify(execFile);

// Cache for ffmpeg path to avoid multiple lookups
let cachedFfmpegPath: string | null = null;

export interface CompressionResult {
  success: boolean;
  outputPath?: string;
  originalSize?: number;
  compressedSize?: number;
  error?: string;
}

/**
 * Get ffmpeg path - prioritizes ffmpeg-static, then bundled asset, then system ffmpeg
 * Uses caching to avoid repeated lookups
 */
export function getFfmpegPath(): string {
  // Return cached path if available
  if (cachedFfmpegPath !== null && fs.existsSync(cachedFfmpegPath)) {
    return cachedFfmpegPath;
  }

  const isWindows = process.platform === "win32";
  const exeExtension = isWindows ? ".exe" : "";

  let foundPath = "";

  // Priority 1: Try ffmpeg-static module (dynamic import/require)
  try {
    // Try CommonJS require
    let ffmpegStaticPath: string | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ffmpegStaticModule = require("ffmpeg-static");
      ffmpegStaticPath =
        typeof ffmpegStaticModule === "string"
          ? ffmpegStaticModule
          : ffmpegStaticModule?.default || ffmpegStaticModule?.path || ffmpegStaticModule;

      if (ffmpegStaticPath && fs.existsSync(ffmpegStaticPath)) {
        foundPath = ffmpegStaticPath;
      }
    } catch {
      // require failed, continue to path-based search
    }
  } catch {
    // Continue to next method
  }

  // Priority 2: Search for ffmpeg-static in node_modules (platform-specific)
  if (!foundPath) {
    // Get the extension directory (where Raycast extensions are installed)
    const extensionDir = environment.assetsPath ? path.resolve(environment.assetsPath, "..") : __dirname;

    // Build search paths array
    const searchPaths: string[] = [
      // Development mode - from project root
      path.join(process.cwd(), "node_modules", "ffmpeg-static", `ffmpeg${exeExtension}`),
      // Built extension - relative to compiled file location
      path.join(__dirname, "..", "..", "node_modules", "ffmpeg-static", `ffmpeg${exeExtension}`),
      // Alternative built extension location
      path.join(__dirname, "node_modules", "ffmpeg-static", `ffmpeg${exeExtension}`),
      // Extension directory (Raycast extension installation location)
      path.join(extensionDir, "node_modules", "ffmpeg-static", `ffmpeg${exeExtension}`),
    ];

    // Try to find node_modules by walking up the directory tree from __dirname
    let currentDir = __dirname;
    for (let i = 0; i < 5; i++) {
      const nodeModulesPath = path.join(currentDir, "node_modules", "ffmpeg-static", `ffmpeg${exeExtension}`);
      searchPaths.push(nodeModulesPath);
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break; // Reached root
      currentDir = parentDir;
    }

    // Try using require.resolve if module resolution is available
    try {
      // Try to resolve the package.json first
      const basePath = require.resolve("ffmpeg-static/package.json");
      const ffmpegPath = path.join(path.dirname(basePath), `ffmpeg${exeExtension}`);
      if (fs.existsSync(ffmpegPath)) {
        searchPaths.unshift(ffmpegPath); // Add to front of array (higher priority)
      }
    } catch {
      // Try direct resolution
      try {
        const resolved = require.resolve(`ffmpeg-static/ffmpeg${exeExtension}`);
        if (fs.existsSync(resolved)) {
          searchPaths.unshift(resolved); // Add to front of array (higher priority)
        }
      } catch {
        // Resolution failed, continue with path-based search
      }
    }

    // Search through all paths
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        foundPath = searchPath;
        break;
      }
    }
  }

  // Priority 3: Bundled asset (Raycast extension assets folder)
  if (!foundPath) {
    const assetPath = path.join(environment.assetsPath, `ffmpeg${exeExtension}`);
    if (fs.existsSync(assetPath)) {
      foundPath = assetPath;
    }
  }

  // Priority 4: System ffmpeg (last resort)
  // Check common system locations for macOS
  if (!foundPath && process.platform === "darwin") {
    const systemPaths = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"];
    for (const systemPath of systemPaths) {
      if (fs.existsSync(systemPath)) {
        foundPath = systemPath;
        break;
      }
    }
  }

  // Final fallback: just "ffmpeg" (will try PATH)
  if (!foundPath) {
    foundPath = "ffmpeg";
  }

  // Cache the found path
  cachedFfmpegPath = foundPath;
  return foundPath;
}

/**
 * Compress an image using ffmpeg
 * Converts to WebP format with optimized settings inspired by Squoosh
 */
export async function compressImage(
  inputPath: string,
  progressCallback?: (stage: string, percentage: number, message?: string) => void,
): Promise<CompressionResult> {
  try {
    progressCallback?.("Analyzing", 10, "Reading image metadata");

    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;

    const ext = path.extname(inputPath).toLowerCase();
    const dir = path.dirname(inputPath);
    const basename = path.basename(inputPath, ext);
    const outputPath = path.join(dir, `${basename}.min.webp`);

    const ffmpegPath = getFfmpegPath();

    progressCallback?.("Compressing", 40, "Converting to WebP");

    // Use ffmpeg to convert to WebP with high quality settings
    const { stderr } = await execFileAsync(
      ffmpegPath,
      [
        "-i",
        inputPath,
        "-c:v",
        "libwebp",
        "-quality",
        "80",
        "-compression_level",
        "6",
        "-y", // Overwrite output file
        outputPath,
      ],
      {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        windowsHide: process.platform === "win32",
      },
    );

    progressCallback?.("Finalizing", 90, "Saving compressed image");

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output file not created. FFmpeg stderr: ${stderr}`);
    }

    const compressedStats = fs.statSync(outputPath);
    const compressedSize = compressedStats.size;

    progressCallback?.("Finalizing", 100, "Complete");

    return {
      success: true,
      outputPath,
      originalSize,
      compressedSize,
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : "Unknown error during image compression";

    // Add helpful debugging info
    if (errorMessage.includes("spawn") || errorMessage.includes("ENOENT")) {
      const ffmpegPath = getFfmpegPath();
      const isWindows = process.platform === "win32";
      const assetPath = path.join(environment.assetsPath, `ffmpeg${isWindows ? ".exe" : ""}`);
      errorMessage = `FFmpeg not found. Tried: ${ffmpegPath}. Asset path: ${assetPath}. Error: ${errorMessage}`;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Compress a video using ffmpeg
 * Uses H.264 codec with CRF for web-optimized output
 */
export async function compressVideo(
  inputPath: string,
  progressCallback?: (stage: string, percentage: number, message?: string) => void,
): Promise<CompressionResult> {
  try {
    progressCallback?.("Analyzing", 10, "Reading video metadata");

    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;

    const ext = path.extname(inputPath).toLowerCase();
    const dir = path.dirname(inputPath);
    const basename = path.basename(inputPath, ext);
    const outputPath = path.join(dir, `${basename}.min.mp4`);

    const ffmpegPath = getFfmpegPath();

    progressCallback?.("Compressing", 40, "Encoding video");

    // Use ffmpeg with web-optimized settings
    const { stderr } = await execFileAsync(
      ffmpegPath,
      [
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-crf",
        "23",
        "-preset",
        "medium",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-y", // Overwrite output file
        outputPath,
      ],
      {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for video
        windowsHide: process.platform === "win32",
      },
    );

    progressCallback?.("Finalizing", 90, "Saving compressed video");

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output file not created. FFmpeg stderr: ${stderr}`);
    }

    const compressedStats = fs.statSync(outputPath);
    const compressedSize = compressedStats.size;

    progressCallback?.("Finalizing", 100, "Complete");

    return {
      success: true,
      outputPath,
      originalSize,
      compressedSize,
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : "Unknown error during video compression";

    // Add helpful debugging info
    if (errorMessage.includes("spawn") || errorMessage.includes("ENOENT")) {
      const ffmpegPath = getFfmpegPath();
      const isWindows = process.platform === "win32";
      const assetPath = path.join(environment.assetsPath, `ffmpeg${isWindows ? ".exe" : ""}`);
      errorMessage = `FFmpeg not found. Tried: ${ffmpegPath}. Asset path: ${assetPath}. Error: ${errorMessage}`;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
