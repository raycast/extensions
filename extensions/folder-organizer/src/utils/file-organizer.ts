import fs from "fs";
import path from "path";

// System files to ignore (these should never be moved)
const SYSTEM_FILES_TO_IGNORE = [".DS_Store", "Thumbs.db", "desktop.ini"];
const PROJECT_MARKER_NAMES = new Set([
  ".git",
  ".hg",
  ".svn",
  ".idea",
  ".venv",
  "node_modules",
  "package.json",
  "deno.json",
  "deno.jsonc",
  "bun.lock",
  "bun.lockb",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
  "requirements.txt",
  "Pipfile",
  "poetry.lock",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "settings.gradle.kts",
  "composer.json",
  "Gemfile",
  "mix.exs",
  "pubspec.yaml",
  "Package.swift",
  "CMakeLists.txt",
  "Makefile",
]);
const PROJECT_SOURCE_DIRECTORY_NAMES = new Set(["src", "source"]);
const PROJECT_FILE_EXTENSIONS = new Set([".sln", ".csproj", ".fsproj", ".vbproj", ".vcxproj", ".xcodeproj"]);

export type OrganizationMode = "root" | "full";

export interface OrganizeOptions {
  mode?: OrganizationMode;
}

export interface OrganizeResult {
  total_files: number;
  total_moved?: number;
  categories: Record<string, string[]> | Record<string, number>;
  categories_created?: string[];
  moved_files?: string[];
  skipped_projects?: string[];
  success: boolean;
  error?: string;
}

interface FileToOrganize {
  sourcePath: string;
  fileName: string;
  relativePath: string;
}

interface ScanResult {
  files: FileToOrganize[];
  skippedProjects: string[];
}

function isProjectFolder(entries: fs.Dirent[]): boolean {
  return entries.some((entry) => {
    if (PROJECT_MARKER_NAMES.has(entry.name)) {
      return true;
    }

    if (entry.isDirectory() && PROJECT_SOURCE_DIRECTORY_NAMES.has(entry.name.toLowerCase())) {
      return true;
    }

    return PROJECT_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase());
  });
}

/**
 * Get list of files that can be organized
 */
function getFilesToOrganize(
  folderPath: string,
  fileTypes: Record<string, string[]>,
  options: OrganizeOptions,
): ScanResult {
  const filesToOrganize: FileToOrganize[] = [];
  const skippedProjects: string[] = [];
  const categoryFolders = new Set(Object.keys(fileTypes));
  const mode = options.mode ?? "root";

  function scanFolder(currentPath: string, isRoot: boolean) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    // Full organization leaves project trees untouched, including dependencies
    // and generated files.
    if (mode === "full" && isProjectFolder(entries)) {
      skippedProjects.push(path.relative(folderPath, currentPath) || ".");
      return;
    }

    for (const entry of entries) {
      if (SYSTEM_FILES_TO_IGNORE.includes(entry.name) || entry.isSymbolicLink()) {
        continue;
      }

      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (mode === "full" && !(isRoot && categoryFolders.has(entry.name))) {
          scanFolder(entryPath, false);
        }
        continue;
      }

      if (entry.isFile()) {
        filesToOrganize.push({
          sourcePath: entryPath,
          fileName: entry.name,
          relativePath: path.relative(folderPath, entryPath),
        });
      }
    }
  }

  scanFolder(folderPath, true);
  return {
    files: filesToOrganize,
    skippedProjects,
  };
}

/**
 * Categorize files based on their extensions
 */
function categorizeFiles(
  files: FileToOrganize[],
  fileTypes: Record<string, string[]>,
): Record<string, FileToOrganize[]> {
  const categories: Record<string, FileToOrganize[]> = {};

  for (const file of files) {
    const fileExt = path.extname(file.fileName).toLowerCase();
    let categoryFound = false;

    // Find matching category
    for (const [category, extensions] of Object.entries(fileTypes)) {
      if (category === "★ Other") {
        continue;
      }

      if (extensions.some((ext) => ext.toLowerCase() === fileExt)) {
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(file);
        categoryFound = true;
        break;
      }
    }

    // If no category found, put in "Other"
    if (!categoryFound) {
      if (!categories["★ Other"]) {
        categories["★ Other"] = [];
      }
      categories["★ Other"].push(file);
    }
  }

  return categories;
}

/**
 * Analyze what would be organized without moving files
 */
export function analyzeFolder(
  folderPath: string,
  fileTypes: Record<string, string[]>,
  options: OrganizeOptions = {},
): OrganizeResult {
  try {
    const { files, skippedProjects } = getFilesToOrganize(folderPath, fileTypes, options);
    const categories = categorizeFiles(files, fileTypes);

    // Convert file lists to counts for analysis
    const categoryCounts: Record<string, number> = {};
    for (const [category, fileList] of Object.entries(categories)) {
      categoryCounts[category] = fileList.length;
    }

    return {
      total_files: files.length,
      categories: categoryCounts,
      skipped_projects: skippedProjects,
      success: true,
    };
  } catch (error) {
    return {
      total_files: 0,
      categories: {},
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Actually organize files into folders
 */
export function organizeFolder(
  folderPath: string,
  fileTypes: Record<string, string[]>,
  options: OrganizeOptions = {},
): OrganizeResult {
  try {
    const { files, skippedProjects } = getFilesToOrganize(folderPath, fileTypes, options);

    if (files.length === 0) {
      return {
        total_files: 0,
        total_moved: 0,
        categories: {},
        categories_created: [],
        skipped_projects: skippedProjects,
        success: true,
      };
    }

    const categories = categorizeFiles(files, fileTypes);
    const createdFolders: string[] = [];
    const movedFiles: string[] = [];
    let totalMoved = 0;

    // Create folders and move files
    for (const [category, filesInCategory] of Object.entries(categories)) {
      if (filesInCategory.length === 0) {
        continue;
      }

      // Create category folder
      const categoryPath = path.join(folderPath, category);
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
        createdFolders.push(category);
      }

      // Move files to category folder
      for (const file of filesInCategory) {
        const srcPath = file.sourcePath;
        let dstPath = path.join(categoryPath, file.fileName);

        // Handle name conflicts
        let counter = 1;
        const originalDst = dstPath;
        while (fs.existsSync(dstPath)) {
          const ext = path.extname(originalDst);
          const name = path.basename(originalDst, ext);
          const dir = path.dirname(originalDst);
          dstPath = path.join(dir, `${name}_${counter}${ext}`);
          counter++;
        }

        // Move the file
        fs.renameSync(srcPath, dstPath);
        movedFiles.push(file.relativePath);
        totalMoved++;
      }
    }

    return {
      total_files: files.length,
      total_moved: totalMoved,
      categories: Object.fromEntries(
        Object.entries(categories).map(([category, categoryFiles]) => [
          category,
          categoryFiles.map((file) => file.relativePath),
        ]),
      ),
      categories_created: createdFolders,
      moved_files: movedFiles,
      skipped_projects: skippedProjects,
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      total_files: 0,
      total_moved: 0,
      categories: {},
      categories_created: [],
    };
  }
}
