// src/fileProcessor.ts
import fs from "fs/promises";
import path from "path";
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
} from "./constants";
import type { ProjectEntry, ProcessDirectoryOptions, FileProcessorConfig } from "./types";
import { Stats } from "fs";

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
 * Determines the programming language of a file based on its extension or name.
 * @param filePath The absolute path to the file.
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

  if (stats.size > maxFileSizeBytes) {
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
    let content = await fs.readFile(filePath, "utf-8");
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
      return `[File content omitted: Potentially binary (detected excessive NULL bytes). Size: ${fileSizeKB}]`;
    }
    // Normalize line endings to LF for consistency
    content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    return content;
  } catch (eUtf8) {
    console.warn(`UTF-8 decoding failed for ${filePath}, trying Latin-1. Error: ${(eUtf8 as Error).message}`);
    try {
      let content = await fs.readFile(filePath, "latin1");
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
 * Used for streaming processing to format content immediately after reading.
 * @param entryPath The absolute path to the file.
 * @param relativePath The relative path from project root.
 * @param stats The file stats.
 * @param maxFileSizeBytes Maximum file size for content inclusion.
 * @returns Formatted file content string.
 */
async function formatFileContentStreaming(
  entryPath: string,
  relativePath: string,
  stats: Stats,
  maxFileSizeBytes: number,
): Promise<string> {
  const fileLanguage = getFileLanguage(entryPath);
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
  const { projectRoot, currentPath, ignoreFilter, maxFileSizeBytes, onProgress, safetyLimits } = options;
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
          // Check limits before incrementing to prevent exceeding
          if (safetyLimits.filesProcessed >= safetyLimits.maxFiles) {
            throw new Error(
              `File count limit exceeded (${safetyLimits.maxFiles} files). Consider using .gitignore or selecting fewer files.`,
            );
          }
          const projectedTotalSize = safetyLimits.totalSize + (stats.size || 0);
          if (projectedTotalSize >= safetyLimits.maxTotalSizeBytes) {
            throw new Error(
              `Total size limit exceeded (${bytesToMB(safetyLimits.maxTotalSizeBytes)} MB). ` +
                `Current: ${bytesToMB(safetyLimits.totalSize).toFixed(2)} MB, ` +
                `File: ${bytesToMB(stats.size || 0).toFixed(2)} MB. ` +
                `Consider using .gitignore to exclude large files or selecting fewer files.`,
            );
          }

          safetyLimits.filesProcessed++;
          safetyLimits.totalSize += stats.size || 0;
        }

        // Format and output file content immediately
        const formattedContent = await formatFileContentStreaming(entryPath, relativePath, stats, maxFileSizeBytes);
        onFileContent(formattedContent);

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
  const additionalPatterns = configAdditionalPatterns
    ? configAdditionalPatterns
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : undefined;
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
        // Check safety limits before processing with improved error messages
        if (safetyLimits.filesProcessed >= safetyLimits.maxFiles) {
          throw new Error(
            `File count limit exceeded (${safetyLimits.maxFiles} files). ` +
              `Consider using .gitignore to exclude files or selecting fewer files/directories.`,
          );
        }
        const projectedTotalSize = safetyLimits.totalSize + (stats.size || 0);
        if (projectedTotalSize >= safetyLimits.maxTotalSizeBytes) {
          throw new Error(
            `Total size limit exceeded (${bytesToMB(safetyLimits.maxTotalSizeBytes)} MB). ` +
              `Current: ${bytesToMB(safetyLimits.totalSize).toFixed(2)} MB, ` +
              `File: ${bytesToMB(stats.size || 0).toFixed(2)} MB. ` +
              `Consider using .gitignore to exclude large files or selecting fewer files.`,
          );
        }

        // Format and output file content immediately
        const formattedContent = await formatFileContentStreaming(entryPath, relativePath, stats, maxFileSizeBytes);
        onFileContent(formattedContent);

        // Store only metadata, not content
        entries.push({
          name: basename,
          type: "file",
          path: relativePath,
          size: stats.size,
          language: getFileLanguage(entryPath),
          // content is not stored to reduce memory usage
        });

        // Update safety counters
        safetyLimits.filesProcessed++;
        safetyLimits.totalSize += stats.size || 0;
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
 * Estimates the number of tokens in a text string using a simple heuristic.
 * Uses the approximation: 1 token ≈ 4 characters for English code.
 * @param content The text content to estimate tokens for.
 * @returns The estimated number of tokens.
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

/**
 * Generates a single string containing the project's code structure and file contents.
 * Uses streaming processing to reduce memory usage by formatting file contents immediately
 * as they are read, rather than storing all contents in memory.
 * @param config Configuration object for generation, including AI instruction preference.
 * @param onProgress Optional callback for reporting progress during processing.
 * @returns A promise that resolves to the complete project code string.
 */
export async function generateProjectCodeString(
  config: FileProcessorConfig,
  onProgress?: (progress: { message: string; details?: string }) => void,
): Promise<string> {
  const {
    projectDirectory,
    maxFileSizeBytes,
    includeAiInstructions,
    processOnlySelectedFiles,
    selectedFilePaths,
    additionalIgnorePatterns,
  } = config;
  const projectRoot = path.resolve(projectDirectory);

  const progressCallback = (message: string, details?: string) => {
    if (onProgress) onProgress({ message, details });
  };

  // Use array-based string building for streaming output
  const outputParts: string[] = [];
  const fileContentsParts: string[] = [];

  // Start building output header
  if (includeAiInstructions) {
    outputParts.push("<ai_instruction>\n" + AI_INSTRUCTION_CONTENT + "</ai_instruction>\n\n");
  }

  // Build metadata section (token count will be added later)
  const metadataLines: string[] = [];
  metadataLines.push("  Date created: " + new Date().toISOString());
  metadataLines.push("  Project root: " + projectRoot);
  metadataLines.push("  Processing mode: " + (processOnlySelectedFiles ? "Selected files only" : "Entire directory"));
  if (processOnlySelectedFiles && selectedFilePaths) {
    metadataLines.push("  Selected files: " + selectedFilePaths.length);
  }
  metadataLines.push("  Max file size for content: " + bytesToMB(maxFileSizeBytes).toFixed(2) + " MB");
  // gitignoreUsed and token count will be set later
  metadataLines.push("  AI instructions included: " + (includeAiInstructions ? "Yes" : "No"));

  outputParts.push("<metadata>\n" + metadataLines.join("\n") + "\n");

  let projectStructure: ProjectEntry[];
  let gitignoreUsed = false;

  // Callback to receive formatted file content as it's processed
  const onFileContent = (formattedContent: string) => {
    fileContentsParts.push(formattedContent);
  };

  if (processOnlySelectedFiles && selectedFilePaths && selectedFilePaths.length > 0) {
    progressCallback("Processing selected files and directories...");
    try {
      // Parse additional ignore patterns
      const additionalPatterns = additionalIgnorePatterns
        ? additionalIgnorePatterns
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p.length > 0)
        : undefined;
      const ignoreResult = await loadIgnoreFilter(projectRoot, additionalPatterns);
      gitignoreUsed = ignoreResult.gitignoreUsed;

      projectStructure = await processMixedSelectionStreaming(config, onFileContent, onProgress);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes("limit exceeded")) {
        throw new Error(
          `Project too large: ${errorMessage}. Consider selecting fewer files/directories or using .gitignore.`,
        );
      }
      if (errorMessage.includes("heap") || errorMessage.includes("memory")) {
        throw new Error(
          `Memory limit exceeded. The selected files/directories are too large to process. Please select fewer items or use .gitignore.`,
        );
      }
      throw error;
    }
  } else {
    progressCallback("Loading ignore rules...");
    const additionalPatterns = additionalIgnorePatterns
      ? additionalIgnorePatterns
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
      : undefined;
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

    try {
      projectStructure = await processDirectoryRecursiveStreaming(
        {
          projectRoot,
          currentPath: projectRoot,
          ignoreFilter: ignoreResult.filter,
          maxFileSizeBytes,
          safetyLimits,
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
      const errorMessage = (error as Error).message;
      if (errorMessage.includes("limit exceeded")) {
        throw new Error(
          `Project too large: ${errorMessage}. Consider using .gitignore, selecting specific files/directories, or processing a smaller directory.`,
        );
      }
      if (errorMessage.includes("heap") || errorMessage.includes("memory")) {
        throw new Error(
          `Memory limit exceeded. The project is too large to process. Please select specific files/directories or use .gitignore to exclude large files.`,
        );
      }
      throw error;
    }
  }

  // Update metadata with gitignore status before closing tag
  const metadataPartIndex = outputParts.findIndex((part) => part.includes("<metadata>"));
  if (metadataPartIndex !== -1) {
    const metadataContent = outputParts[metadataPartIndex];
    // Insert gitignore status before closing metadata tag
    outputParts[metadataPartIndex] = metadataContent.replace(
      "\n",
      "\n  .gitignore used: " + (gitignoreUsed ? "Yes" : "No") + "\n",
    );
  }

  progressCallback("Formatting output...");

  // Format project structure
  outputParts.push("<project_structure>\n");
  outputParts.push(formatProjectStructure(projectStructure));
  outputParts.push("</project_structure>\n\n");

  // Add file contents that were collected during streaming processing
  outputParts.push("<file_contents>");
  outputParts.push(fileContentsParts.join(""));
  if (fileContentsParts.length > 0) {
    outputParts.push("\n");
  }
  outputParts.push("</file_contents>\n");

  if (includeAiInstructions) {
    outputParts.push("\n<ai_analysis_guide>\n" + AI_ANALYSIS_GUIDE_CONTENT + "</ai_analysis_guide>\n");
  }

  // Join all parts
  let output = outputParts.join("");

  // Clear arrays to help GC
  outputParts.length = 0;
  fileContentsParts.length = 0;

  // Calculate estimated tokens and add to metadata
  const estimatedTokens = estimateTokens(output);
  const metadataEndTagIndex = output.indexOf("</metadata>");
  if (metadataEndTagIndex !== -1) {
    const beforeMetadataEnd = output.substring(0, metadataEndTagIndex);
    const afterMetadataEnd = output.substring(metadataEndTagIndex);
    output = beforeMetadataEnd + "  Estimated tokens: ~" + estimatedTokens + "\n" + afterMetadataEnd;
  }

  // Try to trigger garbage collection if available
  if (global.gc && typeof global.gc === "function") {
    try {
      global.gc();
    } catch {
      // GC not available or failed, ignore
    }
  }

  progressCallback("Generation complete!");
  return output;
}
