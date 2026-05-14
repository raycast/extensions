import fs from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import crypto from "crypto";
import yauzl from "yauzl";

export interface ProcessConfig {
  inputDir: string;
  outputDir: string;
  filter: string;
  deleteZips: boolean;
  safeMode?: boolean; // Enable Zip Bomb protection
  outputFolderName?: string; // Optional root folder name for merged contents
}

export interface ProcessStats {
  zipFilesFound: number;
  filesMerged: number;
  duplicatesSkipped: number;
  conflictsRenamed: number;
  errors: string[];
}

export interface ProgressCallback {
  (stage: string, current: number, total: number): void;
}

/**
 * Main processing function that orchestrates the entire ZIP merge operation.
 * Works with Google Takeout archives or any ZIP files.
 */
export async function processTakeout(config: ProcessConfig, onProgress?: ProgressCallback): Promise<ProcessStats> {
  const stats: ProcessStats = {
    zipFilesFound: 0,
    filesMerged: 0,
    duplicatesSkipped: 0,
    conflictsRenamed: 0,
    errors: [],
  };

  // Validate input directory
  await validateDirectory(config.inputDir, "Input directory");
  await validateDirectory(config.outputDir, "Output directory");

  // Determine the final output directory
  const finalOutputDir = config.outputFolderName
    ? path.join(config.outputDir, config.outputFolderName)
    : config.outputDir;

  const stagingDir = path.join(config.outputDir, ".Unpackr_Staging");

  try {
    // Create staging directory and final output directory
    onProgress?.("Initializing", 0, 1);
    await fs.mkdir(stagingDir, { recursive: true });
    if (config.outputFolderName) {
      await fs.mkdir(finalOutputDir, { recursive: true });
    }

    // Find ZIP files
    onProgress?.("Finding ZIP files", 0, 1);
    const zipFiles = await findZips(config.inputDir, config.filter);
    stats.zipFilesFound = zipFiles.length;

    if (zipFiles.length === 0) {
      throw new Error(`No ZIP files found matching filter "${config.filter}"`);
    }

    // Unzip all files
    let processedZips = 0;
    await runConcurrent(zipFiles, 2, async (zipPath) => {
      processedZips++;
      onProgress?.("Unzipping", processedZips, zipFiles.length);

      const zipBasename = path.basename(zipPath, ".zip");
      const extractDir = path.join(stagingDir, zipBasename);

      try {
        await extractZip(zipPath, extractDir, config.safeMode);
      } catch (error) {
        const errorMsg = `Failed to extract ${zipBasename}: ${getErrorMessage(error)}`;
        stats.errors.push(errorMsg);
        console.error(errorMsg);
        // Continue with other ZIPs
      }
    });

    // Merge files from staging to output
    onProgress?.("Merging files", 0, 1);
    await mergeFiles(stagingDir, finalOutputDir, stats);

    // Cleanup
    onProgress?.("Cleaning up", 0, 1);
    await cleanup(stagingDir, config.deleteZips ? zipFiles : []);

    // Write error log if there were any errors
    if (stats.errors.length > 0) {
      await writeErrorLog(config.inputDir, stats);
    }

    return stats;
  } catch (error) {
    // On error, preserve staging directory for debugging
    const errorMsg = getErrorMessage(error);
    stats.errors.push(errorMsg);

    // Write error log for critical failures
    await writeErrorLog(config.inputDir, stats);

    throw error;
  }
}

/**
 * Validates that a directory exists and is accessible
 */
async function validateDirectory(dirPath: string, label: string): Promise<void> {
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      throw new Error(`${label} is not a directory: ${dirPath}`);
    }
    // Test write access by trying to create and delete a temp file
    const testFile = path.join(dirPath, `.unpackr-test-${Date.now()}`);
    try {
      await fs.writeFile(testFile, "test");
      await fs.unlink(testFile);
    } catch {
      throw new Error(`${label} is not writable: ${dirPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`${label} does not exist: ${dirPath}`);
    }
    throw error;
  }
}

/**
 * Finds all ZIP files in the input directory matching the filter
 */
async function findZips(inputDir: string, filter: string): Promise<string[]> {
  const entries = await fs.readdir(inputDir, { withFileTypes: true });

  const zipFiles = entries
    .filter((entry) => {
      if (!entry.isFile()) return false;
      const name = entry.name.toLowerCase();
      return name.endsWith(".zip") && name.includes(filter.toLowerCase());
    })
    .map((entry) => path.join(inputDir, entry.name));

  return zipFiles;
}

/**
 * Extracts a ZIP file to the specified directory using yauzl
 */
async function extractZip(zipPath: string, extractDir: string, safeMode = true): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(new Error(`Failed to open ZIP file: ${err.message}`));
        return;
      }

      if (!zipfile) {
        reject(new Error("ZIP file is invalid"));
        return;
      }

      // Zip Bomb Protection: Check compression ratios during extraction

      let entryCount = 0;
      let errorOccurred = false;

      zipfile.on("entry", async (entry: yauzl.Entry) => {
        if (errorOccurred) return;

        try {
          // Zip Bomb Check (Safe Mode): Compression ratio only
          if (safeMode) {
            // Check compression ratio (only for reasonably large files to avoid false positives on empty/tiny files)
            if (entry.compressedSize > 0 && entry.uncompressedSize > 10 * 1024 * 1024) {
              // 10MB+
              const ratio = entry.uncompressedSize / entry.compressedSize;
              if (ratio > 100) {
                zipfile.close();
                throw new Error(
                  `Zip Bomb detected: File ${entry.fileName} has suspicious compression ratio (${ratio.toFixed(0)}x)`,
                );
              }
            }
          }

          const entryPath = path.join(extractDir, entry.fileName);

          // Security check: ensure the path doesn't escape the extract directory
          const normalizedPath = path.normalize(entryPath);
          if (!normalizedPath.startsWith(path.normalize(extractDir))) {
            throw new Error(`Invalid ZIP entry path (path traversal attempt): ${entry.fileName}`);
          }

          // Directory entry
          if (/\/$/.test(entry.fileName)) {
            await fs.mkdir(entryPath, { recursive: true });
            zipfile.readEntry();
            return;
          }

          // File entry
          await fs.mkdir(path.dirname(entryPath), { recursive: true });

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              errorOccurred = true;
              reject(new Error(`Failed to read entry ${entry.fileName}: ${err.message}`));
              return;
            }

            if (!readStream) {
              zipfile.readEntry();
              return;
            }

            const writeStream = createWriteStream(entryPath);

            readStream.on("error", (error) => {
              errorOccurred = true;
              reject(new Error(`Read error for ${entry.fileName}: ${error.message}`));
            });

            writeStream.on("error", (error) => {
              errorOccurred = true;
              reject(new Error(`Write error for ${entry.fileName}: ${error.message}`));
            });

            writeStream.on("finish", () => {
              entryCount++;
              zipfile.readEntry();
            });

            readStream.pipe(writeStream);
          });
        } catch (error) {
          errorOccurred = true;
          reject(error);
        }
      });

      zipfile.on("end", () => {
        if (!errorOccurred) {
          if (entryCount === 0) {
            reject(new Error("ZIP file is empty"));
          } else {
            resolve();
          }
        }
      });

      zipfile.on("error", (error) => {
        errorOccurred = true;
        reject(new Error(`ZIP processing error: ${error.message}`));
      });

      zipfile.readEntry();
    });
  });
}

/**
 * Recursively finds all Google Photos directories in the staging area
 */
async function findGooglePhotosDirectories(stagingDir: string): Promise<string[]> {
  const photoDirs: string[] = [];

  async function scan(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const fullPath = path.join(dir, entry.name);

        // Check if this is a "Google Photos" directory
        if (entry.name === "Google Photos") {
          photoDirs.push(fullPath);
        } else {
          // Recursively scan subdirectories
          await scan(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.error(`Error scanning directory ${dir}: ${getErrorMessage(error)}`);
    }
  }

  await scan(stagingDir);
  return photoDirs;
}

/**
 * Gets all immediate subdirectories in a directory (non-recursive)
 */
async function getImmediateSubdirectories(dir: string): Promise<string[]> {
  const subdirs: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        subdirs.push(path.join(dir, entry.name));
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${getErrorMessage(error)}`);
  }

  return subdirs;
}

/**
 * Gets the actual content directory, skipping single-root-folder structures
 * Many ZIPs contain a single root folder - this unwraps it
 * Also filters out macOS metadata like __MACOSX and .DS_Store
 */
async function getContentDirectory(dir: string): Promise<string> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    // Filter out macOS metadata and hidden files
    const meaningfulEntries = entries.filter((entry) => {
      // Ignore __MACOSX folders
      if (entry.name === "__MACOSX") return false;
      // Ignore .DS_Store and other hidden files starting with .
      if (entry.name.startsWith(".")) return false;
      return true;
    });

    // If there's exactly one meaningful entry and it's a directory, unwrap it
    if (meaningfulEntries.length === 1 && meaningfulEntries[0].isDirectory()) {
      const singleDir = path.join(dir, meaningfulEntries[0].name);
      // Recursively check in case there are nested single directories
      return await getContentDirectory(singleDir);
    }

    // Otherwise, this is the content directory
    return dir;
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${getErrorMessage(error)}`);
    return dir;
  }
}

/**
 * Recursively gets all file paths in a directory
 * Skips macOS metadata files like .DS_Store
 */
/**
 * Recursively yields all file paths in a directory
 * Skips macOS metadata files like .DS_Store
 */
async function* getAllFilesGenerator(dir: string): AsyncGenerator<string> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip __MACOSX and hidden files
      if (entry.name === "__MACOSX" || entry.name.startsWith("._")) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        yield* getAllFilesGenerator(fullPath);
      } else if (entry.isFile()) {
        // Skip .DS_Store and other hidden files
        if (!entry.name.startsWith(".")) {
          yield fullPath;
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${getErrorMessage(error)}`);
  }
}

/**
 * Calculates SHA256 hash of a file
 */
async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (error) => reject(error));
  });
}

/**
 * Merges files from staging directory to output directory with deduplication
 */
async function mergeFiles(stagingDir: string, outputDir: string, stats: ProcessStats): Promise<void> {
  const knownHashes = new Map<string, string>(); // destPath -> hash

  // Find all Google Photos directories
  const photoDirs = await findGooglePhotosDirectories(stagingDir);

  if (photoDirs.length === 0) {
    // No Google Photos structure - treat as regular ZIP files
    // Get all immediate subdirectories in staging (one per ZIP)
    const zipDirs = await getImmediateSubdirectories(stagingDir);

    // Process each ZIP's directory, merging all contents into output
    for (const zipDir of zipDirs) {
      // Unwrap single-root-folder structures (e.g., vacation-1.zip containing vacation-1/ folder)
      const contentDir = await getContentDirectory(zipDir);
      await processFilesFromDirectory(contentDir, contentDir, outputDir, knownHashes, stats, false);
    }
  } else {
    // Google Takeout structure found - process each Google Photos directory
    for (const photoDir of photoDirs) {
      await processFilesFromDirectory(photoDir, photoDir, outputDir, knownHashes, stats, true);
    }
  }
}

/**
 * Processes files from a source directory and merges them to output
 */
async function processFilesFromDirectory(
  sourceDir: string,
  baseDir: string,
  outputDir: string,
  knownHashes: Map<string, string>,
  stats: ProcessStats,
  isGooglePhotos: boolean,
): Promise<void> {
  // Use generator to iterate files one by one to save memory
  for await (const srcPath of getAllFilesGenerator(sourceDir)) {
    try {
      // Calculate relative path from the base directory
      const relativePath = path.relative(baseDir, srcPath);

      // Construct destination path
      // If Google Photos structure, add "Google Photos" prefix
      // Otherwise, merge directly to output
      const destPath = isGooglePhotos
        ? path.join(outputDir, "Google Photos", relativePath)
        : path.join(outputDir, relativePath);

      // Check if destination already exists
      const destExists = await fileExists(destPath);

      if (!destExists) {
        // File doesn't exist, simply move it
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await moveFile(srcPath, destPath);
        stats.filesMerged++;
      } else {
        // File exists - check for duplicates

        // Optimization: Check file sizes first
        const srcStat = await fs.stat(srcPath);
        const destStat = await fs.stat(destPath);

        let isDuplicate = false;

        if (srcStat.size === destStat.size) {
          // Sizes match, check hashes
          const srcHash = await calculateFileHash(srcPath);

          // Get or calculate destination hash
          let destHash = knownHashes.get(destPath);
          if (!destHash) {
            destHash = await calculateFileHash(destPath);
            knownHashes.set(destPath, destHash);
          }

          if (srcHash === destHash) {
            isDuplicate = true;
          }
        }

        if (isDuplicate) {
          // True duplicate - delete source
          await fs.unlink(srcPath);
          stats.duplicatesSkipped++;
        } else {
          // Name conflict with different content (or different size) - rename source
          const newDestPath = await findUniqueFilename(destPath);
          await fs.mkdir(path.dirname(newDestPath), { recursive: true });
          await moveFile(srcPath, newDestPath);
          stats.conflictsRenamed++;
        }
      }
    } catch (error) {
      const errorMsg = `Failed to process file ${path.basename(srcPath)}: ${getErrorMessage(error)}`;
      stats.errors.push(errorMsg);
      console.error(errorMsg);
      // Continue with other files
    }
  }
}

/**
 * Checks if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Moves a file, with fallback to copy+delete for cross-device moves
 */
async function moveFile(src: string, dest: string): Promise<void> {
  try {
    await fs.rename(src, dest);
  } catch (error) {
    // If rename fails (e.g., cross-device), fall back to copy+delete
    if ((error as NodeJS.ErrnoException).code === "EXDEV") {
      await fs.copyFile(src, dest);
      await fs.unlink(src);
    } else {
      throw error;
    }
  }
}

/**
 * Finds a unique filename by appending (1), (2), etc.
 */
async function findUniqueFilename(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);

  let counter = 1;
  let newPath = path.join(dir, `${basename} (${counter})${ext}`);

  while (await fileExists(newPath)) {
    counter++;
    newPath = path.join(dir, `${basename} (${counter})${ext}`);
  }

  return newPath;
}

/**
 * Cleans up staging directory and optionally deletes ZIP files
 */
async function cleanup(stagingDir: string, zipFiles: string[]): Promise<void> {
  // Delete staging directory
  try {
    await fs.rm(stagingDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to delete staging directory: ${getErrorMessage(error)}`);
  }

  // Delete ZIP files if requested
  for (const zipPath of zipFiles) {
    try {
      await fs.unlink(zipPath);
    } catch (error) {
      console.error(`Failed to delete ZIP file ${zipPath}: ${getErrorMessage(error)}`);
    }
  }
}

/**
 * Writes an error log file to the input directory when errors occur
 */
async function writeErrorLog(inputDir: string, stats: ProcessStats): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logFileName = `unpackr-errors-${timestamp}.log`;
    const logPath = path.join(inputDir, logFileName);

    const logContent = [
      "=".repeat(80),
      "Unpackr Error Log",
      "=".repeat(80),
      `Timestamp: ${new Date().toISOString()}`,
      `Input Directory: ${inputDir}`,
      "",
      "Statistics:",
      `  ZIP files found: ${stats.zipFilesFound}`,
      `  Files merged: ${stats.filesMerged}`,
      `  Duplicates skipped: ${stats.duplicatesSkipped}`,
      `  Conflicts renamed: ${stats.conflictsRenamed}`,
      `  Errors occurred: ${stats.errors.length}`,
      "",
      "=".repeat(80),
      "Errors:",
      "=".repeat(80),
      "",
      ...stats.errors.map((error, index) => `${index + 1}. ${error}`),
      "",
      "=".repeat(80),
      "End of Error Log",
      "=".repeat(80),
    ].join("\n");

    await fs.writeFile(logPath, logContent, "utf8");
    console.log(`Error log written to: ${logPath}`);
  } catch (error) {
    // Don't throw if log writing fails - it's not critical
    console.error(`Failed to write error log: ${getErrorMessage(error)}`);
  }
}

/**
 * Extracts error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Helper to run tasks concurrently with a limit
 */
async function runConcurrent<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) await fn(item);
      }
    });
  await Promise.all(workers);
}
