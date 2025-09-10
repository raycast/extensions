import { showHUD, getPreferenceValues, Clipboard, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { promises as fs } from "fs";
import path from "path";

/**
 * Configuration constants for the clipboard to Obsidian extension.
 * These values control various limits and behaviors of the application.
 */
// Constants for configuration
const MAX_CONTENT_LENGTH = 1_000_000; // 1MB limit for clipboard content
const MAX_FILENAME_LENGTH = 50; // Maximum length for normalized filename
const MAX_FILE_CONFLICTS = 100; // Maximum number of file conflicts to handle
const MIN_CLIPBOARD_ITEMS = 2; // Minimum number of clipboard items required

// Type definitions
interface Preferences {
  vaultPath: string;
  notesSubfolder: string;
}

interface ClipboardValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Normalizes text to create a safe filename by removing special characters
 * and limiting length while ensuring the result is not empty.
 *
 * @param text - The input text to normalize
 * @returns A normalized filename safe for use in file systems
 */
function normalizeFileName(text: string): string {
  if (!text || typeof text !== "string") {
    return "untitled";
  }

  const normalized = text
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters except word chars, spaces, and dashes
    .replace(/\s+/g, "-") // Replace multiple spaces with single dash
    .replace(/^-+|-+$/g, "") // Remove leading/trailing dashes
    .replace(/-+/g, "-") // Replace multiple consecutive dashes with single dash
    .substring(0, MAX_FILENAME_LENGTH);

  return normalized || "untitled";
}

/**
 * Gets the current date in YYYYMMDD format for use in filenames.
 *
 * @returns Date string in YYYYMMDD format
 */
function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Validates clipboard content for emptiness, whitespace, and size limits.
 *
 * @param content - The clipboard content to validate
 * @returns Validation result with isValid flag and optional error message
 */
function validateClipboardContent(content: string | undefined): ClipboardValidation {
  if (!content) {
    return {
      isValid: false,
      error: "Clipboard content is empty or undefined",
    };
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return {
      isValid: false,
      error: "Clipboard content cannot be empty or whitespace-only",
    };
  }

  if (trimmedContent.length > MAX_CONTENT_LENGTH) {
    return {
      isValid: false,
      error: `Clipboard content exceeds maximum size limit of ${(MAX_CONTENT_LENGTH / 1_000_000).toFixed(1)}MB`,
    };
  }

  return { isValid: true };
}

/**
 * Validates that the file path is secure and within the expected directory.
 *
 * @param filepath - The file path to validate
 * @param notesDir - The expected parent directory
 * @returns True if the path is safe, false otherwise
 */
function validateFilePath(filepath: string, notesDir: string): boolean {
  const resolvedNotesDir = path.resolve(notesDir);
  const resolvedFilepath = path.resolve(filepath);
  return resolvedFilepath.startsWith(resolvedNotesDir);
}

/**
 * Generates a unique filename by adding a counter suffix if the file already exists.
 *
 * @param originalPath - The original file path
 * @returns Promise resolving to a unique file path
 */
async function generateUniqueFilePath(originalPath: string): Promise<string> {
  let finalPath = originalPath;
  let counter = 1;

  while (counter <= MAX_FILE_CONFLICTS) {
    try {
      await fs.access(finalPath);
      // File exists, generate new name with counter
      const dir = path.dirname(originalPath);
      const ext = path.extname(originalPath);
      const base = path.basename(originalPath, ext);
      const newFilename = `${base}-${counter}${ext}`;
      finalPath = path.join(dir, newFilename);
      counter++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // File doesn't exist, we can use this path
        return finalPath;
      }
      throw error; // Re-throw other errors
    }
  }

  throw new Error(`Unable to generate unique filename after ${MAX_FILE_CONFLICTS} attempts`);
}

/**
 * Main command function that creates an Obsidian note from the last two clipboard items.
 * Uses the shorter text as the filename and the longer text as the note content.
 */
export default async function Command() {
  try {
    // Get and validate preferences
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.vaultPath?.trim()) {
      await showFailureToast("Configuration Error", {
        message: "Obsidian vault path is not configured. Please set it in preferences.",
      });
      return;
    }

    const vaultPath = preferences.vaultPath.replace(/^~/, process.env.HOME || "");
    const notesDir = path.join(vaultPath, preferences.notesSubfolder || "Notes/Unsorted");

    // Validate vault path exists
    try {
      await fs.access(vaultPath);
    } catch {
      await showFailureToast("Vault path not found", {
        message: `Cannot access vault at: ${vaultPath}`,
      });
      return;
    }

    await fs.mkdir(notesDir, { recursive: true });

    // Get the last 2 items from clipboard history (offset 0 and 1)
    const clip1 = await Clipboard.readText({ offset: 0 });
    const clip2 = await Clipboard.readText({ offset: 1 });

    // Check if we have two distinct items
    if (!clip1 || !clip2) {
      await showFailureToast("Insufficient clipboard history", {
        message: "Need at least 2 items in clipboard history",
      });
      return;
    }

    // Ensure the notes directory exists with proper error handling
    try {
      await fs.mkdir(notesDir, { recursive: true });
    } catch (error) {
      await showFailureToast("Directory Creation Error", {
        message: `Failed to create notes directory: ${notesDir}. Check file system permissions.`,
      });
      return;
    }

    // Retrieve clipboard history
    const clipboardItems = await retrieveClipboardHistory();
    if (!clipboardItems) return; // Error already shown in retrieveClipboardHistory

    const { shorter, longer } = clipboardItems;

    // Generate the file path
    const titleSlug = normalizeFileName(shorter);
    const today = getToday();
    const filename = `${today}-${titleSlug}.md`;
    const originalPath = path.join(notesDir, filename);

    // Security validation
    if (!validateFilePath(originalPath, notesDir)) {
      await showFailureToast("Security Error", {
        message: "Generated file path is outside the notes directory",
      });
      return;
    }

    // Generate unique file path
    const finalPath = await generateUniqueFilePath(originalPath);

    // Create the note with proper error handling
    try {
      await fs.writeFile(finalPath, longer, { encoding: "utf8" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown file write error";
      await showFailureToast("File Creation Error", {
        message: `Failed to create note file: ${errorMessage}`,
      });
      return;
    }

    // Open in Obsidian
    await openInObsidian(finalPath);

    await showHUD(`✅ Note created: ${path.basename(finalPath)}`);
  } catch (error) {
    console.error("Error creating note:", error);

    // More specific error categorization
    let errorMessage = "An unexpected error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;

      // Handle specific error types
      if (error.message.includes("ENOSPC")) {
        errorMessage = "Insufficient disk space to create the note";
      } else if (error.message.includes("EACCES")) {
        errorMessage = "Permission denied. Check file system permissions.";
      } else if (error.message.includes("ENAMETOOLONG")) {
        errorMessage = "Generated filename is too long for the file system";
      }
    }

    await showFailureToast("Failed to create note", {
      message: errorMessage,
    });
  }
}

/**
 * Retrieves and validates the last two clipboard items.
 *
 * @returns Object containing shorter and longer clipboard content, or null if validation fails
 */
async function retrieveClipboardHistory(): Promise<{ shorter: string; longer: string } | null> {
  try {
    // Get the last 2 items from clipboard history
    const clip1 = await Clipboard.readText({ offset: 0 });
    const clip2 = await Clipboard.readText({ offset: 1 });

    // Validate we have enough clipboard items
    if (!clip1 || !clip2) {
      await showFailureToast("Insufficient Clipboard History", {
        message: `Need at least ${MIN_CLIPBOARD_ITEMS} items in clipboard history. Try copying more content.`,
      });
      return null;
    }

    // Validate each clipboard item
    const validation1 = validateClipboardContent(clip1);
    const validation2 = validateClipboardContent(clip2);

    if (!validation1.isValid) {
      await showFailureToast("Invalid Clipboard Content", {
        message: `First clipboard item: ${validation1.error}`,
      });
      return null;
    }

    if (!validation2.isValid) {
      await showFailureToast("Invalid Clipboard Content", {
        message: `Second clipboard item: ${validation2.error}`,
      });
      return null;
    }

    const trimmedClip1 = clip1.trim();
    const trimmedClip2 = clip2.trim();

    // Check for identical content
    if (trimmedClip1 === trimmedClip2) {
      await showFailureToast("Duplicate Clipboard Content", {
        message: "The last two clipboard items are identical. Please copy different content.",
      });
      return null;
    }

    // Additional validation: Check if content is reasonable for note creation
    const minContentLength = 1;
    const maxTitleLength = 200; // Reasonable title length

    if (trimmedClip1.length < minContentLength || trimmedClip2.length < minContentLength) {
      await showFailureToast("Content Too Short", {
        message: "Clipboard content must contain at least some meaningful text.",
      });
      return null;
    }

    // Determine which is shorter for title, longer for content
    const [shorter, longer] =
      trimmedClip1.length <= trimmedClip2.length ? [trimmedClip1, trimmedClip2] : [trimmedClip2, trimmedClip1];

    // Warn if title might be too long
    if (shorter.length > maxTitleLength) {
      console.warn(`Title content is quite long (${shorter.length} characters). It will be truncated for filename.`);
    }

    return { shorter, longer };
  } catch (error) {
    console.error("Error retrieving clipboard history:", error);
    await showFailureToast("Clipboard Access Error", {
      message: "Failed to access clipboard history. Please try again.",
    });
    return null;
  }
}

/**
 * Attempts to open the created note in Obsidian.
 *
 * @param filePath - The path to the created note file
 */
async function openInObsidian(filePath: string): Promise<void> {
  try {
    const filename = path.basename(filePath);
    const encodedFilename = encodeURIComponent(filename);
    await open(`obsidian://open?file=${encodedFilename}`);
  } catch (error) {
    console.log("Obsidian not available or failed to open. File created at:", filePath);
    // Don't throw error - file creation was successful even if Obsidian opening failed
  }
}
