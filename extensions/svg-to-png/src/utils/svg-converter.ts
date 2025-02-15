import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import os from "os";
import { v4 as uuidv4 } from "uuid";

const execFilePromise = promisify(execFile);

const CACHE_DIR = path.join(os.tmpdir(), "raycast-svg-converter");

// Function to ensure cache directory exists
async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

// Function to clean old cache files (older than 1 hour)
export async function cleanCache() {
  try {
    if (!existsSync(CACHE_DIR)) return;

    const files = await fs.readdir(CACHE_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      const stats = await fs.stat(filePath);

      // Remove files older than 1 hour
      if (now - stats.mtimeMs > 60 * 60 * 1000) {
        await fs.unlink(filePath);
      }
    }
  } catch (error) {
    console.error("Error cleaning cache:", error);
  }
}

export async function convertSvgToPng(inputPath: string, outputPath: string, scale: number = 1): Promise<void> {
  const tempDir = path.join(path.dirname(outputPath), ".temp");

  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Create temporary directory for output
    if (!existsSync(tempDir)) {
      await fs.mkdir(tempDir);
    }

    // Use qlmanage to convert
    await execFilePromise("/usr/bin/qlmanage", ["-t", "-s", `${1000 * scale}`, "-o", tempDir, inputPath]);

    // qlmanage creates a file with .png extension in the temp directory
    const inputFileName = path.basename(inputPath);
    const tempOutputPath = path.join(tempDir, `${inputFileName}.png`);

    // Check if the converted file exists
    if (!existsSync(tempOutputPath)) {
      throw new Error("Converted file not found");
    }

    // Move the file to final destination
    await fs.rename(tempOutputPath, outputPath);

    // Clean up temp directory only after move is complete
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Clean up temp directory in case of error
    if (existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }

    console.error("Conversion error:", error);
    throw new Error(`Failed to convert SVG: ${error}`);
  }
}

export async function convertSvgToPngTemp(inputPath: string, scale: number = 1): Promise<string> {
  await ensureCacheDir();

  // Generate unique filename
  const uniqueId = uuidv4();
  const tempOutputPath = path.join(CACHE_DIR, `${uniqueId}.png`);

  try {
    // Use qlmanage to convert
    await execFilePromise("/usr/bin/qlmanage", ["-t", "-s", `${1000 * scale}`, "-o", CACHE_DIR, inputPath]);

    // qlmanage creates a file with .png extension
    const inputFileName = path.basename(inputPath);
    const qlOutputPath = path.join(CACHE_DIR, `${inputFileName}.png`);

    // Rename to our unique filename
    if (existsSync(qlOutputPath)) {
      await fs.rename(qlOutputPath, tempOutputPath);
    } else {
      throw new Error("Converted file not found");
    }

    // Clean old cache files
    await cleanCache();

    return tempOutputPath;
  } catch (error) {
    console.error("Conversion error:", error);
    throw new Error(`Failed to convert SVG: ${error}`);
  }
}
