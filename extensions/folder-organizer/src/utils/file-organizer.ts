import fs from "fs";
import path from "path";

// System files to ignore (these should never be moved)
const SYSTEM_FILES_TO_IGNORE = [".DS_Store", "Thumbs.db", "desktop.ini"];

export interface OrganizeResult {
  total_files: number;
  total_moved?: number;
  categories: Record<string, string[]> | Record<string, number>;
  categories_created?: string[];
  moved_files?: string[];
  success: boolean;
  error?: string;
}

/**
 * Get list of files that can be organized
 */
function getFilesToOrganize(folderPath: string): string[] {
  try {
    const allFiles = fs.readdirSync(folderPath);
    const filesToOrganize: string[] = [];

    for (const file of allFiles) {
      const filePath = path.join(folderPath, file);

      // Skip directories
      if (fs.statSync(filePath).isDirectory()) {
        continue;
      }

      // Skip system files
      if (SYSTEM_FILES_TO_IGNORE.includes(file)) {
        continue;
      }

      filesToOrganize.push(file);
    }

    return filesToOrganize;
  } catch (error) {
    console.error("Error reading folder:", error);
    return [];
  }
}

/**
 * Categorize files based on their extensions
 */
function categorizeFiles(files: string[], fileTypes: Record<string, string[]>): Record<string, string[]> {
  const categories: Record<string, string[]> = {};

  for (const file of files) {
    const fileExt = path.extname(file).toLowerCase();
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
export function analyzeFolder(folderPath: string, fileTypes: Record<string, string[]>): OrganizeResult {
  try {
    const files = getFilesToOrganize(folderPath);
    const categories = categorizeFiles(files, fileTypes);

    // Convert file lists to counts for analysis
    const categoryCounts: Record<string, number> = {};
    for (const [category, fileList] of Object.entries(categories)) {
      categoryCounts[category] = fileList.length;
    }

    return {
      total_files: files.length,
      categories: categoryCounts,
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
export function organizeFolder(folderPath: string, fileTypes: Record<string, string[]>): OrganizeResult {
  try {
    const files = getFilesToOrganize(folderPath);

    if (files.length === 0) {
      return {
        total_files: 0,
        total_moved: 0,
        categories: {},
        categories_created: [],
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
        const srcPath = path.join(folderPath, file);
        let dstPath = path.join(categoryPath, file);

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
        movedFiles.push(file);
        totalMoved++;
      }
    }

    return {
      total_files: files.length,
      total_moved: totalMoved,
      categories,
      categories_created: createdFolders,
      moved_files: movedFiles,
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
