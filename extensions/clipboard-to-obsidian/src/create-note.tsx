import { showHUD, getPreferenceValues, Clipboard, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { promises as fs } from "fs";
import path from "path";

function normalizeFileName(text: string): string {
  return (
    text
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "") // Remove leading/trailing dashes
      .substring(0, 30) || "untitled"
  ); // Fallback if result is empty
}

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues<{ vaultPath: string; notesSubfolder: string }>();
    const vaultPath = preferences.vaultPath.replace(/^~/, process.env.HOME || "");
    const notesDir = path.join(vaultPath, preferences.notesSubfolder || "Notes/Unsorted");

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

    // Trim whitespace and check for empty content
    const trimmedClip1 = clip1.trim();
    const trimmedClip2 = clip2.trim();

    if (!trimmedClip1 || !trimmedClip2) {
      await showFailureToast("Empty clipboard content", {
        message: "Clipboard items cannot be empty or whitespace-only",
      });
      return;
    }

    if (trimmedClip1 === trimmedClip2) {
      await showFailureToast("Clipboard items are identical", {
        message: "Need 2 different items in clipboard history",
      });
      return;
    }

    // Check content length limits (reasonable limits for file system)
    const MAX_CONTENT_LENGTH = 1000000; // 1MB limit
    if (trimmedClip1.length > MAX_CONTENT_LENGTH || trimmedClip2.length > MAX_CONTENT_LENGTH) {
      await showFailureToast("Content too large", {
        message: "Clipboard content exceeds maximum size limit",
      });
      return;
    }

    // Determine which is shorter for the title, longer for content
    const [shorter, longer] =
      trimmedClip1.length <= trimmedClip2.length ? [trimmedClip1, trimmedClip2] : [trimmedClip2, trimmedClip1];

    const titleSlug = normalizeFileName(shorter);
    const today = getToday();
    const filename = `${today}-${titleSlug}.md`;
    const filepath = path.join(notesDir, filename);

    // Security check: ensure filepath is within the notes directory
    const resolvedNotesDir = path.resolve(notesDir);
    const resolvedFilepath = path.resolve(filepath);
    if (!resolvedFilepath.startsWith(resolvedNotesDir)) {
      await showFailureToast("Invalid file path", {
        message: "Generated file path is outside the notes directory",
      });
      return;
    }

    // Handle file conflicts by adding a counter if file already exists
    let finalFilepath = filepath;
    let counter = 1;
    let fileExists = true;
    while (fileExists && counter <= 100) {
      try {
        await fs.access(finalFilepath);
        // File exists, try with counter
        const fileExt = path.extname(filename);
        const fileBase = path.basename(filename, fileExt);
        const newFilename = `${fileBase}-${counter}${fileExt}`;
        finalFilepath = path.join(notesDir, newFilename);
        counter++;
      } catch (error) {
        // File doesn't exist, we can use this path
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          fileExists = false;
        } else {
          throw error; // Re-throw other errors
        }
      }
    }

    if (counter > 100) {
      throw new Error("Too many file conflicts");
    }

    await fs.writeFile(finalFilepath, longer);

    try {
      const finalFilename = path.basename(finalFilepath);
      const encodedFilename = encodeURIComponent(finalFilename);
      await open(`obsidian://open?file=${encodedFilename}`);
    } catch (error) {
      console.log("Obsidian not available, file created at:", finalFilepath);
    }

    await showHUD(`✅ Note created: ${path.basename(finalFilepath)}`);
  } catch (error) {
    console.error("Error creating note:", error);
    await showFailureToast("Failed to create note", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
