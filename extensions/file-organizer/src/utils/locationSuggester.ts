import fs from "fs";
import path from "path";
import { promisify } from "util";
import { homedir } from "os";
import { FileInfo, LocationSuggestion } from "./types";
import { getPreferences } from "./preferences";
import { levenshteinDistanceNormalized } from "./levenshtein";

const readdir = promisify(fs.readdir);

const INCLUSION_THRESHOLD = 0.15;
const HIGH_SIMILARITY_THRESHOLD = 0.8;

export async function suggestLocations(fileInfo: FileInfo): Promise<LocationSuggestion[]> {
  const { scanDirectories, scanDepth, excludeDirectories } = await getPreferences();
  const suggestions: LocationSuggestion[] = [];

  // Scan each directory to find potential matches
  for (const directory of scanDirectories) {
    try {
      // Initial call passes null for parentDirScore to indicate no parent
      const dirSuggestions = await scanDirectory(directory, fileInfo, scanDepth, excludeDirectories, 0, null);
      suggestions.push(...dirSuggestions);
    } catch (error) {
      console.error(`Error scanning directory ${directory}:`, error);
    }
  }

  suggestions.push(...getDefaultLocations(fileInfo));

  // Deduplicate suggestions based on path
  const uniqueSuggestions: LocationSuggestion[] = [];
  const seenPaths = new Set<string>();

  for (const suggestion of suggestions) {
    if (!seenPaths.has(suggestion.path)) {
      seenPaths.add(suggestion.path);
      uniqueSuggestions.push(suggestion);
    } else {
      // If we have a duplicate, keep the one with the higher confidence score
      const existingIndex = uniqueSuggestions.findIndex((s) => s.path === suggestion.path);
      if (existingIndex !== -1 && suggestion.confidence > uniqueSuggestions[existingIndex].confidence) {
        uniqueSuggestions[existingIndex] = suggestion;
      }
    }
  }
  // Sort by confidence (highest first)
  return uniqueSuggestions.sort((a, b) => b.confidence - a.confidence);
}

async function scanDirectory(
  baseDir: string,
  fileInfo: FileInfo,
  maxDepth: number,
  excludeDirs: string[] = [],
  currentDepth = 0,
  parentDirScore: number | null = null,
): Promise<LocationSuggestion[]> {
  const suggestions: LocationSuggestion[] = [];

  // Replace ~ with home directory if present
  const directory = baseDir.startsWith("~") ? baseDir.replace("~", homedir()) : baseDir;

  // Check if directory is in exclude list
  if (
    excludeDirs.some((excludeDir) => {
      const resolvedExcludeDir = excludeDir.startsWith("~") ? excludeDir.replace("~", homedir()) : excludeDir;
      return directory.startsWith(resolvedExcludeDir) || path.basename(directory) === excludeDir; // Check if directory name matches exclude pattern
    })
  ) {
    return suggestions;
  }

  try {
    const entries = await readdir(directory, { withFileTypes: true });

    // Track directories for recursion
    const subDirs: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        subDirs.push(path.join(directory, entry.name));
      }
    }

    const { score, reason } = calculateDirectoryScore(
      path.basename(directory),
      entries.map((entry) => entry.name),
      parentDirScore ?? 0,
      fileInfo,
    );

    // Only add the current directory if we're at the starting level (depth 1 or higher)
    if (score > INCLUSION_THRESHOLD && maxDepth > 0) {
      suggestions.push({
        path: directory,
        confidence: score,
        reason: reason,
      });
    }

    // Only scan subdirectories if we haven't reached max depth
    // maxDepth = 0: no scanning
    // maxDepth = 1: only starting directories
    // maxDepth = 2: starting directories + one level down
    if (currentDepth < maxDepth - 1) {
      for (const subDir of subDirs) {
        // Pass the current directory's score as the parent score for subdirectories
        const subDirSuggestions = await scanDirectory(subDir, fileInfo, maxDepth, excludeDirs, currentDepth + 1, score);
        suggestions.push(...subDirSuggestions);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
  }

  return suggestions;
}

/**
 * Calculate a comprehensive directory score based on name similarity and parent directory context
 */
function calculateDirectoryScore(
  dirName: string,
  directoryFileNames: string[],
  parentDirScore: number = 0,
  fileInfo: FileInfo,
): { score: number; reason: string } {
  // Calculate directory name similarity
  const dirNameLower = dirName.toLowerCase();

  // Penalize very short directory names (less than 3 characters)
  // These can easily get high similarity scores by coincidence
  let dirNameScore = calculateStringSimilarity(dirNameLower, fileInfo.name.toLowerCase());
  if (dirNameLower.length < 3) {
    // Apply penalty based on length difference with the target filename
    const lengthRatio = dirNameLower.length / fileInfo.name.length;
    dirNameScore = dirNameScore * lengthRatio * 0.5;
  }

  // Check for exact or partial name match (higher weight)
  let bestNameMatch = 0;

  for (const fileName of directoryFileNames) {
    const similarity = calculateStringSimilarity(fileName.toLowerCase(), fileInfo.name.toLowerCase());
    bestNameMatch = Math.max(bestNameMatch, similarity);
  }

  // Calculate final score
  const finalScore = dirNameScore * 0.2 + parentDirScore * 0.2 + bestNameMatch * 0.6;

  let reason = "";
  if (bestNameMatch > HIGH_SIMILARITY_THRESHOLD) {
    reason = "Exact or partial name match";
  } else if (dirNameScore > HIGH_SIMILARITY_THRESHOLD) {
    reason = "Similar to parent directory";
  } else if (parentDirScore > HIGH_SIMILARITY_THRESHOLD) {
    reason = "Similar to parent directory";
  } else {
    reason = "Similar to file name";
  }

  return {
    score: Math.min(1.0, finalScore),
    reason: reason,
  };
}

/**
 * Normalize string by replacing common date formats with "DATE"
 * This helps improve similarity matching by ignoring date differences
 */
function normalizeDates(input: string): string {
  // Common date formats:
  // YYYYMMDD, YYYY-MM-DD, YYYY/MM/DD
  // MM-DD-YYYY, MM/DD/YYYY
  // DD-MM-YYYY, DD/MM/YYYY
  // YYYY.MM.DD, DD.MM.YYYY, MM.DD.YYYY

  return (
    input
      // Replace ISO format: YYYY-MM-DD
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "DATE")
      // Replace compact format: YYYYMMDD
      .replace(/\b\d{8}\b(?!\d)/g, "DATE")
      // Replace slash formats: YYYY/MM/DD, MM/DD/YYYY, DD/MM/YYYY
      .replace(/\b\d{4}\/\d{2}\/\d{2}\b/g, "DATE")
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, "DATE")
      // Replace dash formats: MM-DD-YYYY, DD-MM-YYYY
      .replace(/\b\d{1,2}-\d{1,2}-\d{4}\b/g, "DATE")
      // Replace dot formats: YYYY.MM.DD, DD.MM.YYYY, MM.DD.YYYY
      .replace(/\b\d{4}\.\d{2}\.\d{2}\b/g, "DATE")
      .replace(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/g, "DATE")
  );
}

/**
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  // Normalize dates in both strings before comparison
  const normalized1 = normalizeDates(str1).toLocaleLowerCase();
  const normalized2 = normalizeDates(str2).toLocaleLowerCase();

  return levenshteinDistanceNormalized(normalized1, normalized2);
}

function getDefaultLocations(fileInfo: FileInfo): LocationSuggestion[] {
  const home = homedir();
  const suggestions: LocationSuggestion[] = [];

  // Type-based suggestions
  switch (fileInfo.type) {
    case "document":
      suggestions.push({
        path: path.join(home, "Documents"),
        confidence: 0.5,
        reason: "Default Documents folder",
      });
      break;
    case "image":
      suggestions.push({
        path: path.join(home, "Pictures"),
        confidence: 0.5,
        reason: "Default Pictures folder",
      });
      break;
    case "video":
      suggestions.push({
        path: path.join(home, "Movies"),
        confidence: 0.5,
        reason: "Default Movies folder",
      });
      break;
    case "audio":
      suggestions.push({
        path: path.join(home, "Music"),
        confidence: 0.5,
        reason: "Default Music folder",
      });
      break;
    case "code":
      suggestions.push({
        path: path.join(home, "Documents", "Code"),
        confidence: 0.4,
        reason: "Common Code folder location",
      });
      break;
    case "archive":
      suggestions.push({
        path: path.join(home, "Downloads"),
        confidence: 0.4,
        reason: "Common location for archives",
      });
      break;
    default:
      suggestions.push({
        path: path.join(home, "Downloads"),
        confidence: 0.3,
        reason: "Default download location",
      });
  }

  return suggestions;
}
