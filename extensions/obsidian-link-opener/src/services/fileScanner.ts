import { promises as fs } from "fs";
import * as path from "path";
import { glob } from "glob";
import { NoteWithUrl } from "../types";
import { LocalStorage } from "@raycast/api";
import { CacheManager } from "./cacheManager";
import { FrontmatterReader } from "./frontmatterReader";

async function getObsidianIgnorePatterns(vaultPath: string): Promise<string[]> {
  const ignorePatterns: string[] = [
    "**/node_modules/**",
    "**/.obsidian/**", // Always exclude .obsidian config folder
    "**/.trash/**", // Always exclude trash
  ];

  try {
    // Read Obsidian's app.json for user-defined ignore filters
    const appJsonPath = path.join(vaultPath, ".obsidian", "app.json");
    const appJson = JSON.parse(await fs.readFile(appJsonPath, "utf-8"));

    if (appJson.userIgnoreFilters && Array.isArray(appJson.userIgnoreFilters)) {
      // Convert Obsidian patterns to glob patterns
      for (const filter of appJson.userIgnoreFilters) {
        // Handle different pattern formats
        if (filter.startsWith("/") && filter.endsWith("/")) {
          // Regex pattern like /\.Desktop/
          const pattern = filter.slice(1, -1).replace(/\\/g, "");
          ignorePatterns.push(`**/${pattern}/**`);
        } else if (filter.endsWith("/")) {
          // Directory pattern like logseq/
          ignorePatterns.push(`**/${filter}**`);
        } else {
          // File or directory pattern
          ignorePatterns.push(`**/${filter}/**`);
        }
      }
    }
  } catch (error) {
    // If app.json doesn't exist or can't be read, just use defaults
    console.debug("Could not read Obsidian app.json:", error);
  }

  return ignorePatterns;
}

export async function scanVaultForUrls(
  forceRefresh = false
): Promise<NoteWithUrl[]> {
  // Get vault path from LocalStorage
  const vaultPath = await LocalStorage.getItem<string>("selectedVaultPath");

  if (!vaultPath) {
    throw new Error("No vault selected. Please run 'Select Vault' command.");
  }

  const cacheManager = new CacheManager();

  // Monitor memory usage
  const memoryCheck = () => {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);

    // Warn if using more than 80% of heap
    if (heapUsedMB / heapTotalMB > 0.8) {
      console.warn(`High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB`);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }

    return heapUsedMB;
  };

  // Clear cache if force refresh is requested
  if (forceRefresh) {
    cacheManager.clearCache(vaultPath);
  }

  // Try to get cached notes first
  const cachedNotes = await cacheManager.getCachedNotes(vaultPath);
  if (cachedNotes && !forceRefresh) {
    return cachedNotes;
  }

  // Get ignore patterns from Obsidian settings
  const ignorePatterns = await getObsidianIgnorePatterns(vaultPath);

  // Find all markdown files
  const pattern = "**/*.md";
  const files = await glob(pattern, {
    cwd: vaultPath,
    ignore: ignorePatterns,
    absolute: true,
  });

  // Get all unique directories
  const directories = new Set<string>();
  for (const file of files) {
    let dir = path.dirname(file);
    while (dir !== vaultPath && dir !== path.dirname(dir)) {
      directories.add(dir);
      dir = path.dirname(dir);
    }
  }
  directories.add(vaultPath);

  // Collect directory modification times
  const directoryMtimes: Record<string, number> = {};
  for (const dir of directories) {
    try {
      const stats = await fs.stat(dir);
      directoryMtimes[dir] = stats.mtime.getTime();
    } catch {
      // Directory might have been deleted
    }
  }

  // Get list of files that need updating
  const filesSet = new Set(files);
  const { toUpdate, cachedFiles } = await cacheManager.getInvalidatedFiles(
    vaultPath,
    filesSet
  );

  const notesWithUrls: NoteWithUrl[] = [];
  const fileStats = new Map<string, { size: number; mtime: number }>();
  const frontmatterReader = new FrontmatterReader();

  // Add cached files that haven't changed
  for (const [filePath, cachedFile] of cachedFiles) {
    if (!toUpdate.includes(filePath)) {
      const relativePath = path.relative(vaultPath, filePath);
      const title = path.basename(filePath, ".md");

      for (const urlInfo of cachedFile.urls) {
        notesWithUrls.push({
          id: `${filePath}-${urlInfo.property}`,
          title,
          path: relativePath,
          vault: vaultPath,
          frontmatter: {}, // We don't store full frontmatter in cache
          lastModified: new Date(cachedFile.mtime),
          aliases: cachedFile.aliases,
          url: urlInfo.value,
          urlSource: urlInfo.property,
        });
      }

      fileStats.set(filePath, {
        size: cachedFile.size,
        mtime: cachedFile.mtime,
      });
    }
  }

  // Process files in batches to avoid memory issues
  const BATCH_SIZE = 50; // Process 50 files at a time

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);

    // Check memory before processing batch
    const memUsed = memoryCheck();
    if (memUsed > 400) {
      // If using more than 400MB, reduce batch size
      const reducedBatch = batch.slice(0, Math.max(10, BATCH_SIZE / 2));
      batch.length = reducedBatch.length;
    }

    await Promise.all(
      batch.map(async (filePath) => {
        try {
          // Use partial file reading for better performance
          const { data: frontmatter } = await frontmatterReader.readFrontmatter(
            filePath
          );

          if (!frontmatter || typeof frontmatter !== "object") {
            return;
          }

          // Get file stats for actual modification time
          const stats = await fs.stat(filePath);
          fileStats.set(filePath, {
            size: stats.size,
            mtime: stats.mtime.getTime(),
          });

          // Extract aliases from frontmatter
          let aliases: string[] | undefined;
          if (frontmatter.aliases) {
            if (Array.isArray(frontmatter.aliases)) {
              aliases = frontmatter.aliases.filter(
                (a: unknown) => typeof a === "string"
              ) as string[];
            } else if (typeof frontmatter.aliases === "string") {
              aliases = [frontmatter.aliases];
            }
          }

          // Check all properties for valid URLs
          for (const [property, value] of Object.entries(frontmatter)) {
            // Skip non-string values
            if (typeof value !== "string") {
              continue;
            }

            // Check if the value is a valid URL
            if (isValidUrl(value)) {
              const relativePath = path.relative(vaultPath, filePath);
              // Use frontmatter title/name if available, otherwise use filename
              const title =
                (typeof frontmatter.title === "string"
                  ? frontmatter.title
                  : null) ||
                (typeof frontmatter.name === "string"
                  ? frontmatter.name
                  : null) ||
                path.basename(filePath, ".md");

              notesWithUrls.push({
                id: `${filePath}-${property}`,
                title,
                path: relativePath,
                vault: vaultPath,
                frontmatter: {}, // Don't store full frontmatter to save memory
                lastModified: stats.mtime,
                aliases,
                url: value,
                urlSource: property,
              });
            }
          }
        } catch (error) {
          // Silently skip files that can't be read
        }
      })
    );
  }

  // Update cache with new data
  await cacheManager.setCachedNotes(
    vaultPath,
    notesWithUrls,
    directoryMtimes,
    fileStats
  );

  return notesWithUrls;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
