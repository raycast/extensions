// src/fileProcessor.ts
import fs from "fs/promises";
import { createWriteStream, WriteStream, createReadStream } from "fs";
import { Transform } from "stream";
import path from "path";
import os from "os";
import ignore from "ignore";
import mime from "mime-types";
import {
  ALWAYS_TEXT_EXTENSIONS,
  HARDCODED_BASE_IGNORE_PATTERNS,
  LANGUAGE_EXTENSION_MAP,
  NON_TEXT_MIME_TYPE_PREFIXES,
  formatProjectStructure,
  AI_INSTRUCTION_CONTENT,
  AI_ANALYSIS_GUIDE_CONTENT,
  bytesToMB,
  formatFileSizeKB,
  SAFETY_LIMITS,
  LARGE_FILE_THRESHOLD_BYTES,
  STREAMING_FILE_THRESHOLD_BYTES,
  BUFFER_CHUNK_SIZE,
  MAX_BUFFER_SIZE,
} from "./constants";
import type { ProjectEntry, ProcessDirectoryOptions, FileProcessorConfig } from "./types";
import { Stats } from "fs";
import { parseIgnorePatterns } from "./utils/ignorePatterns";
import { isMemoryError, formatMemoryError } from "./utils/errorHandling";
import { estimateTokens } from "./utils/tokens";
import { checkSafetyLimits } from "./utils/safetyLimits";

/**
 * Parses the .gitignore file from the project root and combines its rules
 * with the hardcoded base ignore patterns.
 * @param projectRoot The absolute path to the project root directory.
 * @returns An object containing the `ignore` instance and a boolean indicating if .gitignore was used.
 */
async function loadIgnoreFilter(
  projectRoot: string,
  additionalIgnorePatterns?: string[],
): Promise<{ filter: ReturnType<typeof ignore>; gitignoreUsed: boolean }> {
  // Start with hardcoded base ignore patterns
  const ig = ignore().add(HARDCODED_BASE_IGNORE_PATTERNS as string[]);

  if (additionalIgnorePatterns) {
    ig.add(additionalIgnorePatterns as string[]);
  }

  const gitignorePath = path.join(projectRoot, ".gitignore");
  let gitignoreUsed = false;
  try {
    const content = await fs.readFile(gitignorePath, "utf-8");
    // Filter out empty lines and comments
    const userPatterns = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    if (userPatterns.length > 0) {
      ig.add(userPatterns); // Add user patterns, which can override base patterns if negation is used
      gitignoreUsed = true;
      console.log(`Parsed ${userPatterns.length} patterns from .gitignore at ${gitignorePath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      // ENOENT (file not found) is acceptable
      console.warn(`Warning: Could not read .gitignore file at ${gitignorePath}:`, (error as Error).message);
    } else {
      console.log(`.gitignore not found at ${gitignorePath}, using only base ignore patterns.`);
    }
  }
  return { filter: ig, gitignoreUsed };
}

/**
 * Reads a file using streaming for large files to reduce memory usage.
 * @param filePath The path to the file.
 * @param encoding The encoding to use (default: 'utf-8').
 * @returns A promise that resolves to the file content as a string.
 */
function readFileStreaming(filePath: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    // Read as Buffer (no encoding option), then convert to string with specified encoding
    const stream = createReadStream(filePath);

    stream.on("data", (chunk) => {
      // chunk is Buffer when no encoding is specified
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else {
        // Fallback: convert string to Buffer (shouldn't happen without encoding)
        chunks.push(Buffer.from(chunk as string, "utf-8"));
      }
    });

    stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString(encoding));
    });

    stream.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Determines the programming language of a file based on its extension or name.
 *
 * @param filePath - The absolute path to the file.
 * @returns A string representing the language, or an empty string if not determined.
 */
function getFileLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (LANGUAGE_EXTENSION_MAP[ext]) {
    return LANGUAGE_EXTENSION_MAP[ext];
  }
  const basename = path.basename(filePath).toLowerCase(); // For files like 'Dockerfile', 'Makefile'
  if (LANGUAGE_EXTENSION_MAP[basename]) {
    return LANGUAGE_EXTENSION_MAP[basename];
  }
  return "";
}

/**
 * Attempts to read the content of a file, with checks for size and binary nature.
 * Normalizes line endings to LF.
 * Note: The returned content should be used immediately and not stored in memory
 * for extended periods to reduce memory usage in streaming processing.
 * @param filePath The absolute path to the file.
 * @param stats The fs.Stats object for the file.
 * @param maxFileSizeBytes The maximum size in bytes for including file content.
 * @returns The file content as a string, or a message indicating why it's not included.
 */
async function readFileContent(filePath: string, stats: Stats, maxFileSizeBytes: number): Promise<string> {
  const fileSizeKB = formatFileSizeKB(stats.size);
  const maxAllowedSizeMB = bytesToMB(maxFileSizeBytes).toFixed(2);

  // Log large file reads for debugging
  if (stats.size > LARGE_FILE_THRESHOLD_BYTES) {
    // Files larger than threshold
    console.log(
      `[readFileContent] Reading large file: ${path.basename(filePath)} (${bytesToMB(stats.size).toFixed(2)} MB)`,
    );
  }

  if (stats.size > maxFileSizeBytes) {
    console.log(
      `[readFileContent] File too large, omitting: ${path.basename(filePath)} (${fileSizeKB} > ${maxAllowedSizeMB} MB)`,
    );
    return `[File content omitted: Size (${fileSizeKB}) exceeds maximum allowed (${maxAllowedSizeMB} MB)]`;
  }
  if (stats.size === 0) {
    return "[File is empty]";
  }

  const fileExtension = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath); // For files like 'LICENSE' without extension

  const mimeType = mime.lookup(filePath);
  if (mimeType) {
    const isNonTextMime = NON_TEXT_MIME_TYPE_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
    // If MIME suggests non-text, only proceed if it's in ALWAYS_TEXT_EXTENSIONS
    if (
      isNonTextMime &&
      !ALWAYS_TEXT_EXTENSIONS.includes(fileExtension) &&
      !ALWAYS_TEXT_EXTENSIONS.includes(fileName)
    ) {
      return `[File content omitted: Detected as non-text or binary (MIME: ${mimeType}). Size: ${fileSizeKB}]`;
    }
  } else {
    // If MIME type is unknown, rely solely on ALWAYS_TEXT_EXTENSIONS
    if (!ALWAYS_TEXT_EXTENSIONS.includes(fileExtension) && !ALWAYS_TEXT_EXTENSIONS.includes(fileName)) {
      return `[File content omitted: Unknown file type or potentially binary (extension: ${fileExtension}). Size: ${fileSizeKB}]`;
    }
  }

  try {
    const readStartTime = Date.now();
    let content: string;

    // For large files, use streaming to reduce memory pressure
    // Note: This still loads file into memory, but in chunks. For true streaming, use formatFileContentStreaming with writeStream.
    if (stats.size > LARGE_FILE_THRESHOLD_BYTES) {
      console.log(
        `[readFileContent] Using stream read for large file: ${path.basename(filePath)} (${bytesToMB(stats.size).toFixed(2)} MB)`,
      );
      content = await readFileStreaming(filePath, "utf-8");
    } else {
      content = await fs.readFile(filePath, "utf-8");
    }

    const readDuration = Date.now() - readStartTime;

    // Log slow file reads (taking more than 1 second)
    if (readDuration > 1000) {
      console.log(
        `[readFileContent] Slow read: ${path.basename(filePath)} took ${readDuration}ms (${bytesToMB(stats.size).toFixed(2)} MB)`,
      );
    }

    // Heuristic for binary files misidentified as UTF-8: check for excessive NULL bytes
    let nullBytes = 0;
    const sampleLength = Math.min(content.length, 1024);
    for (let i = 0; i < sampleLength; i++) {
      if (content.charCodeAt(i) === 0) {
        nullBytes++;
      }
    }
    if (nullBytes > 10 && nullBytes / sampleLength > 0.05) {
      // Threshold: >10 NULLs and >5% of sample
      console.log(`[readFileContent] Binary file detected: ${path.basename(filePath)}`);
      return `[File content omitted: Potentially binary (detected excessive NULL bytes). Size: ${fileSizeKB}]`;
    }
    // Normalize line endings to LF for consistency
    content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    return content;
  } catch (eUtf8) {
    console.warn(`UTF-8 decoding failed for ${filePath}, trying Latin-1. Error: ${(eUtf8 as Error).message}`);
    try {
      let content: string;
      // Use streaming for large files even when falling back to latin1
      if (stats.size > LARGE_FILE_THRESHOLD_BYTES) {
        content = await readFileStreaming(filePath, "latin1");
      } else {
        content = await fs.readFile(filePath, "latin1");
      }
      content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      return content;
    } catch (eLatin1) {
      console.error(
        `Failed to read file ${filePath} with both UTF-8 and Latin-1. Error: ${(eLatin1 as Error).message}`,
      );
      return `[File content omitted: Could not read file content (tried UTF-8 and Latin-1). Size: ${fileSizeKB}. Error: ${(
        eLatin1 as Error
      ).message.substring(0, 100)}]`;
    }
  }
}

/**
 * Formats a single file's content into the output format.
 * For large files (>20MB), writes directly to stream to avoid loading entire file into memory.
 * For smaller files, reads content and returns formatted string.
 * @param entryPath The absolute path to the file.
 * @param relativePath The relative path from project root.
 * @param stats The file stats.
 * @param maxFileSizeBytes Maximum file size for content inclusion.
 * @param writeStream Optional write stream for large files. If provided, writes directly to stream.
 * @returns Formatted file content string (only for small files, empty string for large files written to stream).
 */
async function formatFileContentStreaming(
  entryPath: string,
  relativePath: string,
  stats: Stats,
  maxFileSizeBytes: number,
  writeStream?: WriteStream,
): Promise<string> {
  const fileLanguage = getFileLanguage(entryPath);
  // Use streaming for large files if writeStream is available to avoid memory issues
  const isLargeFile = stats.size > STREAMING_FILE_THRESHOLD_BYTES;

  // For large files with writeStream, write directly to stream
  if (isLargeFile && writeStream && stats.size <= maxFileSizeBytes) {
    console.log(
      `[formatFileContentStreaming] Writing large file directly to stream: ${path.basename(entryPath)} (${bytesToMB(stats.size).toFixed(2)} MB)`,
    );

    // Write file header
    let header = `\n<file path="${relativePath}" size="${formatFileSizeKB(stats.size)}"`;
    if (fileLanguage) {
      header += ` language="${fileLanguage}"`;
    }
    header += ">\n";
    await writeStreamChunk(writeStream, header);

    // Stream file content directly to output
    await streamFileToOutput(entryPath, writeStream);

    // Write file footer
    await writeStreamChunk(writeStream, "\n</file>\n");

    return ""; // Return empty string as content was written to stream
  }

  // For smaller files, use existing approach
  const fileContent = await readFileContent(entryPath, stats, maxFileSizeBytes);

  const parts: string[] = [];
  parts.push(`\n<file path="${relativePath}" size="${formatFileSizeKB(stats.size)}"`);
  if (fileLanguage) {
    parts.push(` language="${fileLanguage}"`);
  }
  parts.push(">\n");
  parts.push(fileContent);
  parts.push("\n</file>\n");

  const formatted = parts.join("");
  // Clear references to help GC
  parts.length = 0;
  return formatted;
}

/**
 * Creates a transform stream that normalizes line endings (CRLF/LF to LF).
 * Processes data in chunks without accumulating entire content in memory.
 */
function createLineEndingNormalizer(): Transform {
  let lastChar = "";

  return new Transform({
    encoding: "utf-8",
    transform(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null, data?: string) => void) {
      let data = chunk.toString("utf-8");

      // Handle case where previous chunk ended with \r
      if (lastChar === "\r") {
        if (data[0] === "\n") {
          // \r\n -> \n, skip the \r
          data = data.substring(1);
        } else {
          // \r without \n -> \n
          data = "\n" + data;
        }
        lastChar = "";
      }

      // Normalize \r\n to \n and standalone \r to \n
      data = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      // Check if chunk ends with \r (might be followed by \n in next chunk)
      if (data.length > 0 && data[data.length - 1] === "\r") {
        lastChar = "\r";
        data = data.slice(0, -1) + "\n";
      }

      callback(null, data);
    },
    flush(callback: (error?: Error | null, data?: string) => void) {
      // Handle trailing \r
      if (lastChar === "\r") {
        callback(null, "\n");
      } else {
        callback();
      }
    },
  });
}

/**
 * Streams a file directly to output stream using pipe with transform for line ending normalization.
 * This approach is more memory-efficient as it uses Node.js built-in backpressure handling.
 * @param filePath The path to the file to stream.
 * @param writeStream The output write stream.
 */
async function streamFileToOutput(filePath: string, writeStream: WriteStream): Promise<void> {
  return new Promise((resolve, reject) => {
    const readStream = createReadStream(filePath, { encoding: "utf-8", highWaterMark: BUFFER_CHUNK_SIZE });
    const normalizer = createLineEndingNormalizer();

    let isResolved = false;
    let hasError = false;

    const cleanup = (error?: Error) => {
      if (hasError) return;
      hasError = true;

      // Destroy streams on error
      if (error) {
        if (!readStream.destroyed) {
          readStream.destroy();
        }
        if (!normalizer.destroyed) {
          normalizer.destroy();
        }
      }

      // Remove all listeners to prevent memory leaks
      readStream.removeAllListeners();
      normalizer.removeAllListeners();
    };

    const handleError = (error: Error) => {
      cleanup(error);
      if (!isResolved) {
        isResolved = true;
        reject(error);
      }
    };

    const handleEnd = () => {
      if (!isResolved && !hasError) {
        isResolved = true;
        cleanup();
        resolve();
      }
    };

    // Pipe: readStream -> normalizer -> writeStream
    // Node.js handles backpressure automatically through pipe
    readStream.pipe(normalizer).pipe(writeStream, { end: false }); // end: false to keep writeStream open for other files

    readStream.on("error", handleError);
    normalizer.on("error", handleError);
    writeStream.on("error", handleError);

    // Resolve when normalizer finishes (after all data is processed)
    normalizer.on("end", handleEnd);

    // Also handle read stream end as fallback
    readStream.on("end", () => {
      // Normalizer will emit 'end' after processing all data
    });
  });
}

/**
 * Recursively processes a directory with streaming output.
 * For each file, reads content, formats it immediately, and writes to output callback.
 * Returns only the directory structure (without file contents) to reduce memory usage.
 * @param options Configuration for directory processing.
 * @param onFileContent Callback to receive formatted file content as it's processed.
 * @returns A promise that resolves to the directory structure and accumulated formatted content.
 */
async function processDirectoryRecursiveStreaming(
  options: ProcessDirectoryOptions,
  onFileContent: (formattedContent: string) => void,
): Promise<ProjectEntry[]> {
  const { projectRoot, currentPath, ignoreFilter, maxFileSizeBytes, onProgress, safetyLimits, writeStream } = options;
  const entries: ProjectEntry[] = [];
  let filesCollectedInThisCall = 0;

  // Check safety limits with improved error messages
  if (safetyLimits) {
    const timeElapsed = Date.now() - safetyLimits.startTime;
    if (timeElapsed > safetyLimits.maxScanTimeMs) {
      throw new Error(
        `Scan time limit exceeded (${safetyLimits.maxScanTimeMs / 1000}s). ` +
          `Consider using .gitignore to exclude unnecessary files or selecting specific directories.`,
      );
    }
    if (safetyLimits.filesProcessed >= safetyLimits.maxFiles) {
      throw new Error(
        `File count limit exceeded (${safetyLimits.maxFiles} files). ` +
          `Consider using .gitignore to exclude files (e.g., node_modules, build, dist) or selecting fewer files/directories.`,
      );
    }
    if (safetyLimits.totalSize >= safetyLimits.maxTotalSizeBytes) {
      throw new Error(
        `Total size limit exceeded (${bytesToMB(safetyLimits.maxTotalSizeBytes)} MB). ` +
          `Current: ${bytesToMB(safetyLimits.totalSize).toFixed(2)} MB. ` +
          `Consider using .gitignore to exclude large files (e.g., *.log, *.min.js, vendor) or selecting fewer files.`,
      );
    }
  }

  try {
    const dirContents = await fs.readdir(currentPath, { withFileTypes: true });

    // Sort entries alphabetically, directories first, then files
    dirContents.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const dirent of dirContents) {
      const entryPath = path.join(currentPath, dirent.name);
      let relativePathForIgnore = path.relative(projectRoot, entryPath).replace(/\\/g, "/");
      if (relativePathForIgnore === "") relativePathForIgnore = ".";

      const pathToCheck = dirent.isDirectory() ? `${relativePathForIgnore}/` : relativePathForIgnore;
      if (ignoreFilter.ignores(pathToCheck)) {
        continue;
      }

      // Get stats only when needed (for file size or directory size)
      // Type information is already available from dirent (withFileTypes: true)
      const stats = await fs.stat(entryPath);
      const relativePath = path.relative(projectRoot, entryPath);

      if (onProgress) {
        const progressInfo = {
          scannedPath: relativePath,
          filesCollected: filesCollectedInThisCall,
          totalSize: safetyLimits?.totalSize,
          timeElapsed: safetyLimits ? Date.now() - safetyLimits.startTime : undefined,
        };
        onProgress(progressInfo);
      }

      if (dirent.isDirectory()) {
        const children = await processDirectoryRecursiveStreaming(
          {
            projectRoot,
            currentPath: entryPath,
            ignoreFilter,
            maxFileSizeBytes,
            onProgress,
            safetyLimits,
            writeStream,
          },
          onFileContent,
        );
        if (children.length > 0 || !ignoreFilter.ignores(pathToCheck)) {
          entries.push({
            name: dirent.name,
            type: "directory",
            path: relativePath,
            children: children,
            size: stats.size,
          });
        }
      } else if (dirent.isFile()) {
        // Check safety limits before processing file
        if (safetyLimits) {
          checkSafetyLimits(safetyLimits, stats, relativePath);

          // Log progress every 100 files
          if (safetyLimits.filesProcessed % 100 === 0) {
            console.log("[processDirectoryRecursiveStreaming] Progress:", {
              filesProcessed: safetyLimits.filesProcessed,
              totalSize: bytesToMB(safetyLimits.totalSize),
              currentFile: relativePath,
            });
          }
        }

        // Format and output file content immediately
        const formatStartTime = Date.now();
        // Pass writeStream for large files to enable direct streaming
        const formattedContent = await formatFileContentStreaming(
          entryPath,
          relativePath,
          stats,
          maxFileSizeBytes,
          options.writeStream,
        );
        const formatDuration = Date.now() - formatStartTime;

        // Log slow file formatting (taking more than 2 seconds)
        if (formatDuration > 2000) {
          console.log(
            `[processDirectoryRecursiveStreaming] Slow format: ${relativePath} took ${formatDuration}ms (${bytesToMB(stats.size).toFixed(2)} MB)`,
          );
        }

        // Only call onFileContent if content was returned (small files)
        if (formattedContent) {
          onFileContent(formattedContent);
        }

        // Store only metadata, not content
        entries.push({
          name: dirent.name,
          type: "file",
          path: relativePath,
          size: stats.size,
          language: getFileLanguage(entryPath),
          // content is not stored to reduce memory usage
        });
        filesCollectedInThisCall++;
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${currentPath}:`, (error as Error).message);
  }
  return entries;
}

/**
 * Processes a mixed selection of files and directories with streaming output.
 * Files are processed directly, directories are processed recursively.
 * File contents are formatted and written to output callback immediately to reduce memory usage.
 * @param config Configuration with selected file and directory paths.
 * @param onProgress Optional callback for reporting progress.
 * @param onFileContent Callback to receive formatted file content as it's processed.
 * @returns A promise that resolves to an array of ProjectEntry objects (structure only, without file contents).
 */
async function processMixedSelectionStreaming(
  config: FileProcessorConfig,
  onFileContent: (formattedContent: string) => void,
  onProgress?: (progress: { message: string; details?: string }) => void,
  writeStream?: WriteStream,
): Promise<ProjectEntry[]> {
  const { projectDirectory, selectedFilePaths = [], maxFileSizeBytes } = config;
  const projectRoot = path.resolve(projectDirectory);
  const entries: ProjectEntry[] = [];

  const progressCallback = (message: string, details?: string) => {
    if (onProgress) onProgress({ message, details });
  };

  // Load ignore filter once for the entire process
  progressCallback("Loading ignore rules...");
  const { additionalIgnorePatterns: configAdditionalPatterns } = config;
  const additionalPatterns = parseIgnorePatterns(configAdditionalPatterns);
  const { filter: ignoreFilter } = await loadIgnoreFilter(projectRoot, additionalPatterns);

  // Initialize safety limits for directory processing
  const safetyLimits = {
    maxFiles: SAFETY_LIMITS.MAX_FILES,
    maxScanTimeMs: SAFETY_LIMITS.MAX_SCAN_TIME_MS,
    maxTotalSizeBytes: SAFETY_LIMITS.MAX_TOTAL_SIZE_BYTES,
    startTime: Date.now(),
    filesProcessed: 0,
    totalSize: 0,
  };

  for (let i = 0; i < selectedFilePaths.length; i++) {
    const entryPath = selectedFilePaths[i];
    const basename = path.basename(entryPath);
    progressCallback(`Processing ${i + 1}/${selectedFilePaths.length}`, basename);

    try {
      const stats = await fs.stat(entryPath);
      let relativePath = path.relative(projectRoot, entryPath);
      if (relativePath === "" || relativePath === ".") {
        relativePath = path.basename(entryPath);
      }

      if (stats.isFile()) {
        // Check safety limits before processing
        checkSafetyLimits(safetyLimits, stats, relativePath);

        // Format and output file content immediately
        const formatStartTime = Date.now();
        // Pass writeStream for large files to enable direct streaming
        const formattedContent = await formatFileContentStreaming(
          entryPath,
          relativePath,
          stats,
          maxFileSizeBytes,
          writeStream,
        );
        const formatDuration = Date.now() - formatStartTime;

        // Log slow file formatting (taking more than 2 seconds)
        if (formatDuration > 2000) {
          console.log(
            `[processMixedSelectionStreaming] Slow format: ${relativePath} took ${formatDuration}ms (${bytesToMB(stats.size).toFixed(2)} MB)`,
          );
        }

        // Only call onFileContent if content was returned (small files)
        if (formattedContent) {
          onFileContent(formattedContent);
        }

        // Log progress every 50 files
        if (safetyLimits.filesProcessed % 50 === 0) {
          console.log("[processMixedSelectionStreaming] Progress:", {
            filesProcessed: safetyLimits.filesProcessed,
            totalSize: bytesToMB(safetyLimits.totalSize),
            currentFile: relativePath,
          });
        }

        // Store only metadata, not content
        entries.push({
          name: basename,
          type: "file",
          path: relativePath,
          size: stats.size,
          language: getFileLanguage(entryPath),
          // content is not stored to reduce memory usage
        });
      } else if (stats.isDirectory()) {
        progressCallback(`Scanning directory: ${basename}...`);

        // Check if directory itself should be ignored
        let relativePathForIgnore = relativePath.replace(/\\/g, "/");
        if (relativePathForIgnore === "") relativePathForIgnore = ".";
        const pathToCheck = `${relativePathForIgnore}/`;
        if (ignoreFilter.ignores(pathToCheck)) {
          progressCallback(`Skipping ignored directory: ${basename}`);
          continue;
        }

        const children = await processDirectoryRecursiveStreaming(
          {
            projectRoot,
            currentPath: entryPath,
            ignoreFilter,
            maxFileSizeBytes,
            onProgress: (progressUpdate) => {
              if (safetyLimits.filesProcessed >= SAFETY_LIMITS.FILES_WARNING_THRESHOLD) {
                progressCallback(
                  `Scanning ${basename} (large)`,
                  `${progressUpdate.scannedPath} (${safetyLimits.filesProcessed} files)`,
                );
              } else {
                progressCallback(`Scanning ${basename}`, progressUpdate.scannedPath);
              }
            },
            safetyLimits,
            writeStream,
          },
          onFileContent,
        );

        if (children.length > 0) {
          entries.push({
            name: basename,
            type: "directory",
            path: relativePath,
            children: children,
            size: stats.size,
          });
        }
      }
    } catch (error) {
      console.error(`Error processing selected path ${entryPath}:`, (error as Error).message);
      const relativePath = path.relative(projectRoot, entryPath);
      let entryType: "file" | "directory" = "file";
      try {
        const errorStats = await fs.stat(entryPath);
        entryType = errorStats.isDirectory() ? "directory" : "file";
      } catch {
        entryType = "file";
      }
      entries.push({
        name: path.basename(entryPath),
        type: entryType,
        path: relativePath,
        content: `[Error reading ${entryType}: ${(error as Error).message}]`,
      });
    }
  }

  return entries;
}

/**
 * Writes a chunk of data to a write stream, handling backpressure.
 * Returns a promise that resolves when the data is written (or queued).
 * @param stream The write stream to write to.
 * @param data The data to write.
 * @returns A promise that resolves when the write is complete.
 */
async function writeStreamChunk(stream: WriteStream, data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!stream.write(data)) {
      stream.once("drain", resolve);
      stream.once("error", reject);
    } else {
      process.nextTick(resolve);
    }
  });
}

/**
 * Updates metadata placeholders in the generated file using streaming to avoid loading entire file into memory.
 * Reads file in chunks, replaces placeholders, and writes to a temporary file, then replaces original.
 * @param filePath Path to the file to update.
 * @param gitignoreUsed Whether .gitignore was used.
 * @param estimatedTokens Estimated token count.
 */
async function updateMetadataInFile(filePath: string, gitignoreUsed: boolean, estimatedTokens: number): Promise<void> {
  const tempFilePath = `${filePath}.tmp`;
  const readStream = createReadStream(filePath, { encoding: "utf-8", highWaterMark: BUFFER_CHUNK_SIZE });
  const writeStream = createWriteStream(tempFilePath, { encoding: "utf-8" });

  const gitignoreReplacement = `  .gitignore used: ${gitignoreUsed ? "Yes" : "No"}`;
  const tokensReplacement = `  Estimated tokens: ~${estimatedTokens}`;

  let buffer = "";
  let gitignoreReplaced = false;
  let tokensReplaced = false;
  let isPaused = false;

  const flushBuffer = (): void => {
    if (buffer.length === 0) return;

    // Always write in chunks to prevent buffer from growing too large
    const chunkSize = Math.min(buffer.length, BUFFER_CHUNK_SIZE);
    const toWrite = buffer.substring(0, chunkSize);
    buffer = buffer.substring(chunkSize);

    if (!writeStream.write(toWrite)) {
      isPaused = true;
      readStream.pause();
      writeStream.once("drain", () => {
        isPaused = false;
        readStream.resume();
        // Continue flushing if there's more data
        if (buffer.length > 0) {
          flushBuffer();
        }
      });
    }
  };

  return new Promise((resolve, reject) => {
    readStream.on("data", (chunk: string | Buffer) => {
      const chunkStr = typeof chunk === "string" ? chunk : chunk.toString("utf-8");
      buffer += chunkStr;

      // Replace placeholders if found in buffer
      if (!gitignoreReplaced && buffer.includes("  .gitignore used: TOKEN_PLACEHOLDER")) {
        buffer = buffer.replace("  .gitignore used: TOKEN_PLACEHOLDER", gitignoreReplacement);
        gitignoreReplaced = true;
      }
      if (!tokensReplaced && buffer.includes("  Estimated tokens: ~TOKEN_PLACEHOLDER")) {
        buffer = buffer.replace("  Estimated tokens: ~TOKEN_PLACEHOLDER", tokensReplacement);
        tokensReplaced = true;
      }

      // Flush buffer if it exceeds maximum size to prevent memory issues
      if (buffer.length > MAX_BUFFER_SIZE) {
        flushBuffer();
      }
    });

    readStream.on("end", () => {
      // Write remaining buffer
      while (buffer.length > 0) {
        flushBuffer();
      }
      if (!isPaused) {
        writeStream.end();
      } else {
        writeStream.once("drain", () => {
          writeStream.end();
        });
      }
    });

    readStream.on("error", (error: Error) => {
      writeStream.destroy();
      reject(error);
    });

    writeStream.on("error", (error: Error) => {
      readStream.destroy();
      reject(error);
    });

    writeStream.on("finish", async () => {
      try {
        // Replace original file with updated one
        try {
          await fs.unlink(filePath);
        } catch (error) {
          // Ignore ENOENT (file not found) errors
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
          }
        }
        await fs.rename(tempFilePath, filePath);
        resolve();
      } catch (error) {
        // Clean up temp file on error
        try {
          await fs.unlink(tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
        reject(error);
      }
    });
  });
}

/**
 * Generates project code and writes it directly to a file using chunk-based streaming.
 * This approach significantly reduces memory usage by writing content to disk immediately
 * as it's processed, rather than accumulating it in memory.
 * @param config Configuration object for generation, including AI instruction preference.
 * @param outputFilePath The absolute path where the output file should be written.
 * @param onProgress Optional callback for reporting progress during processing.
 * @returns A promise that resolves when the file has been written, containing file stats.
 */
export async function generateProjectCodeToFile(
  config: FileProcessorConfig,
  outputFilePath: string,
  onProgress?: (progress: { message: string; details?: string }) => void,
): Promise<{ fileSize: number; estimatedTokens: number }> {
  const {
    projectDirectory,
    maxFileSizeBytes,
    includeAiInstructions,
    processOnlySelectedFiles,
    selectedFilePaths,
    additionalIgnorePatterns,
  } = config;
  const projectRoot = path.resolve(projectDirectory);

  console.log("[generateProjectCodeToFile] Starting generation", {
    projectRoot,
    maxFileSizeBytes: bytesToMB(maxFileSizeBytes),
    processOnlySelectedFiles,
    selectedFilePathsCount: selectedFilePaths?.length || 0,
    outputFilePath,
  });

  const progressCallback = (message: string, details?: string) => {
    console.log(`[Progress] ${message}`, details || "");
    if (onProgress) onProgress({ message, details });
  };

  const writeStream = createWriteStream(outputFilePath, { encoding: "utf-8" });
  // Increase max listeners to prevent warnings when streaming large files
  writeStream.setMaxListeners(100);

  try {
    // Write header
    if (includeAiInstructions) {
      const headerContent = "<ai_instruction>\n" + AI_INSTRUCTION_CONTENT + "</ai_instruction>\n\n";
      await writeStreamChunk(writeStream, headerContent);
    }

    // Build and write metadata section (token count will be added later)
    const metadataLines: string[] = [];
    metadataLines.push("  Date created: " + new Date().toISOString());
    metadataLines.push("  Project root: " + projectRoot);
    metadataLines.push("  Processing mode: " + (processOnlySelectedFiles ? "Selected files only" : "Entire directory"));
    if (processOnlySelectedFiles && selectedFilePaths) {
      metadataLines.push("  Selected files: " + selectedFilePaths.length);
    }
    metadataLines.push("  Max file size for content: " + bytesToMB(maxFileSizeBytes).toFixed(2) + " MB");
    // gitignoreUsed and token count will be set later - use placeholder
    metadataLines.push("  AI instructions included: " + (includeAiInstructions ? "Yes" : "No"));
    metadataLines.push("  .gitignore used: TOKEN_PLACEHOLDER");
    metadataLines.push("  Estimated tokens: ~TOKEN_PLACEHOLDER");

    const metadataContent = "<metadata>\n" + metadataLines.join("\n") + "\n";
    await writeStreamChunk(writeStream, metadataContent);

    let projectStructure: ProjectEntry[];
    let gitignoreUsed = false;

    // Callback to receive formatted file content as it's processed - write directly to stream
    const onFileContent = async (formattedContent: string) => {
      await writeStreamChunk(writeStream, formattedContent);
    };

    if (processOnlySelectedFiles && selectedFilePaths && selectedFilePaths.length > 0) {
      progressCallback("Processing selected files and directories...");
      try {
        // Parse additional ignore patterns
        const additionalPatterns = parseIgnorePatterns(additionalIgnorePatterns);
        const ignoreResult = await loadIgnoreFilter(projectRoot, additionalPatterns);
        gitignoreUsed = ignoreResult.gitignoreUsed;

        projectStructure = await processMixedSelectionStreaming(config, onFileContent, onProgress, writeStream);
      } catch (error) {
        writeStream.destroy();
        const typedError = error as Error;
        const errorMessage = typedError.message;

        if (errorMessage.includes("limit exceeded")) {
          throw new Error(
            `Project too large: ${errorMessage}\n\n` +
              `Recommendations:\n` +
              `- Use .gitignore to exclude large directories (node_modules, dist, build, .next, .cache)\n` +
              `- Select specific files or directories instead of processing entire project\n` +
              `- Add ignore patterns in the "Additional Ignore Patterns" field (e.g., "*.log, vendor/, coverage/")`,
          );
        }
        if (isMemoryError(typedError)) {
          throw formatMemoryError(typedError);
        }
        throw error;
      }
    } else {
      progressCallback("Loading ignore rules...");
      const additionalPatterns = parseIgnorePatterns(additionalIgnorePatterns);
      const ignoreResult = await loadIgnoreFilter(projectRoot, additionalPatterns);
      gitignoreUsed = ignoreResult.gitignoreUsed;

      progressCallback("Scanning project files...");

      const safetyLimits = {
        maxFiles: SAFETY_LIMITS.MAX_FILES,
        maxScanTimeMs: SAFETY_LIMITS.MAX_SCAN_TIME_MS,
        maxTotalSizeBytes: SAFETY_LIMITS.MAX_TOTAL_SIZE_BYTES,
        startTime: Date.now(),
        filesProcessed: 0,
        totalSize: 0,
      };

      console.log("[generateProjectCodeToFile] Safety limits:", {
        maxFiles: safetyLimits.maxFiles,
        maxTotalSizeBytes: bytesToMB(safetyLimits.maxTotalSizeBytes),
        maxScanTimeMs: safetyLimits.maxScanTimeMs / 1000,
      });

      try {
        projectStructure = await processDirectoryRecursiveStreaming(
          {
            projectRoot,
            currentPath: projectRoot,
            ignoreFilter: ignoreResult.filter,
            maxFileSizeBytes,
            safetyLimits,
            writeStream,
            onProgress: (progressUpdate) => {
              if (safetyLimits.filesProcessed >= SAFETY_LIMITS.FILES_WARNING_THRESHOLD) {
                progressCallback(
                  "Scanning (large project)",
                  `${progressUpdate.scannedPath} (${safetyLimits.filesProcessed} files)`,
                );
              } else {
                progressCallback("Scanning", progressUpdate.scannedPath);
              }
            },
          },
          onFileContent,
        );
      } catch (error) {
        writeStream.destroy();
        const typedError = error as Error;
        const errorMessage = typedError.message;

        if (errorMessage.includes("limit exceeded")) {
          throw new Error(
            `Project too large: ${errorMessage}\n\n` +
              `Recommendations:\n` +
              `- Use .gitignore to exclude large directories (node_modules, dist, build, .next, .cache)\n` +
              `- Select specific files or directories instead of processing entire project\n` +
              `- Add ignore patterns in the "Additional Ignore Patterns" field (e.g., "*.log, vendor/, coverage/")`,
          );
        }
        if (isMemoryError(typedError)) {
          throw formatMemoryError(typedError, { safetyLimits });
        }
        throw error;
      }
    }

    // Close metadata tag (gitignore and tokens will be updated later)
    await writeStreamChunk(writeStream, "</metadata>\n\n");

    progressCallback("Formatting output...");

    // Write project structure
    const structureHeader = "<project_structure>\n";
    await writeStreamChunk(writeStream, structureHeader);

    const structureContent = formatProjectStructure(projectStructure);
    await writeStreamChunk(writeStream, structureContent);

    const structureFooter = "</project_structure>\n\n";
    await writeStreamChunk(writeStream, structureFooter);

    // Write file contents tag opener
    const fileContentsOpen = "<file_contents>";
    await writeStreamChunk(writeStream, fileContentsOpen);

    // File contents are already written via onFileContent callback during processing

    // Write file contents tag closer
    const fileContentsClose = "\n</file_contents>\n";
    await writeStreamChunk(writeStream, fileContentsClose);

    // Write footer if needed
    if (includeAiInstructions) {
      const footerContent = "\n<ai_analysis_guide>\n" + AI_ANALYSIS_GUIDE_CONTENT + "</ai_analysis_guide>\n";
      await writeStreamChunk(writeStream, footerContent);
    }

    // Close the stream and wait for it to finish
    await new Promise<void>((resolve, reject) => {
      writeStream.end((err: Error | null | undefined) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Get actual file size from filesystem
    const stats = await fs.stat(outputFilePath);
    const fileSize = stats.size;

    // Calculate estimated tokens based on actual file size
    const estimatedTokens = estimateTokens("x".repeat(fileSize));

    // Update metadata with actual values using streaming to avoid loading entire file into memory
    await updateMetadataInFile(outputFilePath, gitignoreUsed, estimatedTokens);

    // Try to trigger garbage collection if available
    if (global.gc && typeof global.gc === "function") {
      try {
        global.gc();
      } catch {
        // GC not available or failed, ignore
      }
    }

    progressCallback("Generation complete!");

    console.log("[generateProjectCodeToFile] Generation completed", {
      fileSize: bytesToMB(fileSize),
      estimatedTokens,
      outputFilePath,
    });

    return { fileSize, estimatedTokens };
  } catch (error) {
    writeStream.destroy();
    // Try to delete partial file on error
    try {
      await fs.unlink(outputFilePath);
    } catch {
      // Ignore deletion errors
    }

    // Enhance error message for memory-related errors
    const typedError = error as Error;
    const errorMessage = typedError.message;

    if (isMemoryError(typedError) && !errorMessage.includes("Recommendations:")) {
      throw formatMemoryError(typedError);
    }

    throw error;
  }
}

/**
 * Legacy function for backward compatibility.
 * Generates a single string containing the project's code structure and file contents.
 * NOTE: This function loads the entire output into memory. For large projects, use generateProjectCodeToFile instead.
 * @param config Configuration object for generation, including AI instruction preference.
 * @param onProgress Optional callback for reporting progress during processing.
 * @returns A promise that resolves to the complete project code string.
 * @deprecated Use generateProjectCodeToFile for better memory efficiency.
 */
export async function generateProjectCodeString(
  config: FileProcessorConfig,
  onProgress?: (progress: { message: string; details?: string }) => void,
): Promise<string> {
  // Create a temporary file path
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "raycast-project-code-"));
  const tempFilePath = path.join(tempDir, "temp_output.txt");

  try {
    // Generate to file
    await generateProjectCodeToFile(config, tempFilePath, onProgress);

    // Read the file back into memory
    const content = await fs.readFile(tempFilePath, "utf-8");

    // Clean up
    await fs.unlink(tempFilePath);
    await fs.rmdir(tempDir);

    return content;
  } catch (error) {
    // Clean up on error
    try {
      await fs.unlink(tempFilePath).catch(() => {});
      await fs.rmdir(tempDir).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}
