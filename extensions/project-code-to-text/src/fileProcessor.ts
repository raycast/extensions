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
  formatFileContents,
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
 * Recursively processes a directory, collecting information about its files and subdirectories,
 * respecting ignore rules.
 * @param options Configuration for directory processing.
 * @returns A promise that resolves to an array of ProjectEntry objects.
 */
async function processDirectoryRecursive(options: ProcessDirectoryOptions): Promise<ProjectEntry[]> {
  const { projectRoot, currentPath, ignoreFilter, maxFileSizeBytes, onProgress, safetyLimits } = options;
  const entries: ProjectEntry[] = [];
  let filesCollectedInThisCall = 0; // To correctly update progress for onProgress

  // Check safety limits
  if (safetyLimits) {
    const timeElapsed = Date.now() - safetyLimits.startTime;
    if (timeElapsed > safetyLimits.maxScanTimeMs) {
      throw new Error(`Scan time limit exceeded (${safetyLimits.maxScanTimeMs / 1000}s)`);
    }
    if (safetyLimits.filesProcessed >= safetyLimits.maxFiles) {
      throw new Error(`File count limit exceeded (${safetyLimits.maxFiles} files)`);
    }
    if (safetyLimits.totalSize >= safetyLimits.maxTotalSizeBytes) {
      throw new Error(`Total size limit exceeded (${bytesToMB(safetyLimits.maxTotalSizeBytes)} MB)`);
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
      // Path relative to projectRoot, using forward slashes for 'ignore' compatibility
      let relativePathForIgnore = path.relative(projectRoot, entryPath).replace(/\\/g, "/");
      if (relativePathForIgnore === "") relativePathForIgnore = "."; // Represents the root itself

      // Check if the entry should be ignored
      // Append '/' for directories to match patterns like 'build/'
      const pathToCheck = dirent.isDirectory() ? `${relativePathForIgnore}/` : relativePathForIgnore;
      if (ignoreFilter.ignores(pathToCheck)) {
        continue;
      }

      const stats = await fs.stat(entryPath); // Get stats after ensuring it's not ignored
      const relativePath = path.relative(projectRoot, entryPath); // For display and metadata

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
        const children = await processDirectoryRecursive({
          projectRoot,
          currentPath: entryPath,
          ignoreFilter,
          maxFileSizeBytes,
          onProgress,
          safetyLimits,
        });
        // Include directory if it has non-ignored children or if it's explicitly un-ignored by a '!' rule.
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
        // Update safety counters
        if (safetyLimits) {
          safetyLimits.filesProcessed++;
          safetyLimits.totalSize += stats.size || 0;
        }

        const fileLanguage = getFileLanguage(entryPath);
        const fileContent = await readFileContent(entryPath, stats, maxFileSizeBytes);
        entries.push({
          name: dirent.name,
          type: "file",
          path: relativePath,
          size: stats.size,
          language: fileLanguage,
          content: fileContent,
        });
        filesCollectedInThisCall++;
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${currentPath}:`, (error as Error).message);
    // Could potentially return a ProjectEntry indicating error for this path if needed by UI
  }
  return entries;
}

/**
 * Processes only specific selected files instead of entire directory structure.
 * @param config Configuration with selected file paths.
 * @param onProgress Optional callback for reporting progress.
 * @returns A promise that resolves to an array of ProjectEntry objects for selected files.
 */
async function processSelectedFiles(
  config: FileProcessorConfig,
  onProgress?: (progress: { message: string; details?: string }) => void,
): Promise<ProjectEntry[]> {
  const { projectDirectory, selectedFilePaths = [], maxFileSizeBytes } = config;
  const projectRoot = path.resolve(projectDirectory);
  const entries: ProjectEntry[] = [];

  const progressCallback = (message: string, details?: string) => {
    if (onProgress) onProgress({ message, details });
  };

  for (let i = 0; i < selectedFilePaths.length; i++) {
    const filePath = selectedFilePaths[i];
    progressCallback(`Processing selected file ${i + 1}/${selectedFilePaths.length}`, path.basename(filePath));

    try {
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        const relativePath = path.relative(projectRoot, filePath);
        const fileLanguage = getFileLanguage(filePath);
        const fileContent = await readFileContent(filePath, stats, maxFileSizeBytes);

        entries.push({
          name: path.basename(filePath),
          type: "file",
          path: relativePath,
          size: stats.size,
          language: fileLanguage,
          content: fileContent,
        });
      }
    } catch (error) {
      console.error(`Error processing selected file ${filePath}:`, (error as Error).message);
      // Add an entry indicating the error
      entries.push({
        name: path.basename(filePath),
        type: "file",
        path: path.relative(projectRoot, filePath),
        content: `[Error reading file: ${(error as Error).message}]`,
      });
    }
  }

  return entries;
}

/**
 * Generates a single string containing the project's code structure and file contents.
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
    additionalIgnorePatterns,
    includeAiInstructions,
    processOnlySelectedFiles,
    selectedFilePaths,
  } = config;
  const projectRoot = path.resolve(projectDirectory);

  const progressCallback = (message: string, details?: string) => {
    if (onProgress) onProgress({ message, details });
  };

  let projectStructure: ProjectEntry[];
  let gitignoreUsed = false;

  if (processOnlySelectedFiles && selectedFilePaths && selectedFilePaths.length > 0) {
    // Process only selected files
    progressCallback("Processing selected files...");
    projectStructure = await processSelectedFiles(config, onProgress);
  } else {
    // Process entire directory structure
    progressCallback("Loading ignore rules...");
    const ignoreResult = await loadIgnoreFilter(
      projectRoot,
      additionalIgnorePatterns?.split(",").map((pattern) => pattern.trim()),
    );
    gitignoreUsed = ignoreResult.gitignoreUsed;

    progressCallback("Scanning project files...");

    // Initialize safety limits
    const safetyLimits = {
      maxFiles: SAFETY_LIMITS.MAX_FILES,
      maxScanTimeMs: SAFETY_LIMITS.MAX_SCAN_TIME_MS,
      maxTotalSizeBytes: SAFETY_LIMITS.MAX_TOTAL_SIZE_BYTES,
      startTime: Date.now(),
      filesProcessed: 0,
      totalSize: 0,
    };

    try {
      projectStructure = await processDirectoryRecursive({
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
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes("limit exceeded")) {
        throw new Error(
          `Project too large: ${errorMessage}. Consider using .gitignore or processing a smaller directory.`,
        );
      }
      throw error;
    }
  }

  progressCallback("Formatting output...");

  let output = "";

  if (includeAiInstructions) {
    output += "<ai_instruction>\n" + AI_INSTRUCTION_CONTENT + "</ai_instruction>\n\n";
  }

  output += "<metadata>\n";
  output += `  Date created: ${new Date().toISOString()}\n`;
  output += `  Project root: ${projectRoot}\n`;
  output += `  Processing mode: ${processOnlySelectedFiles ? "Selected files only" : "Entire directory"}\n`;
  if (processOnlySelectedFiles && selectedFilePaths) {
    output += `  Selected files: ${selectedFilePaths.length}\n`;
  }
  output += `  Max file size for content: ${bytesToMB(maxFileSizeBytes).toFixed(2)} MB\n`;
  output += `  .gitignore used: ${gitignoreUsed ? "Yes" : "No"}\n`;
  output += `  AI instructions included: ${includeAiInstructions ? "Yes" : "No"}\n`;
  output += "</metadata>\n\n";

  output += "<project_structure>\n";
  output += formatProjectStructure(projectStructure);
  output += "</project_structure>\n\n";

  output += "<file_contents>";
  const fileContents = formatFileContents(projectStructure);
  output += fileContents;
  if (projectStructure.length > 0 && fileContents.trim() !== "") {
    output += "\n"; // Ensure a newline after the last </file> if content exists
  }
  output += "</file_contents>\n";

  if (includeAiInstructions) {
    output += "\n<ai_analysis_guide>\n" + AI_ANALYSIS_GUIDE_CONTENT + "</ai_analysis_guide>\n";
  }

  progressCallback("Generation complete!");
  return output;
}
