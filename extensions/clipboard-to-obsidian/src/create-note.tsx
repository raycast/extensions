import { showHUD, getPreferenceValues, Clipboard, open, showToast, Toast } from "@raycast/api";
import { promises as fs } from "fs";
import path from "path";

interface Preferences {
  vaultPath: string;
  notesSubfolder: string;
}

function normalizeFileName(text: string): string {
  return text
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 30);
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
    const preferences = getPreferenceValues<Preferences>();
    const vaultPath = preferences.vaultPath.replace(/^~/, process.env.HOME || "");
    const notesDir = path.join(vaultPath, preferences.notesSubfolder || "Notes/Unsorted");

    await fs.mkdir(notesDir, { recursive: true });

    // Get the last 2 items from clipboard history (offset 0 and 1)
    const clip1 = await Clipboard.readText({ offset: 0 });
    const clip2 = await Clipboard.readText({ offset: 1 });

    // Check if we have two distinct items
    if (!clip1 || !clip2) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Insufficient clipboard history",
        message: "Need at least 2 items in clipboard history",
      });
      return;
    }

    if (clip1 === clip2) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard items are identical",
        message: "Need 2 different items in clipboard history",
      });
      return;
    }

    // Determine which is shorter for the title, longer for content
    const [shorter, longer] = clip1.length <= clip2.length ? [clip1, clip2] : [clip2, clip1];

    const titleSlug = normalizeFileName(shorter);
    const today = getToday();
    const filename = `${today}-${titleSlug}.md`;
    const filepath = path.join(notesDir, filename);

    await fs.writeFile(filepath, longer);

    try {
      const encodedFilename = encodeURIComponent(filename);
      await open(`obsidian://open?file=${encodedFilename}`);
    } catch (error) {
      console.log("Obsidian not available, file created at:", filepath);
    }

    await showHUD(`✅ Note created: ${filename}`);
  } catch (error) {
    console.error("Error creating note:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create note",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
