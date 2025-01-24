import { showHUD, Clipboard } from "@raycast/api";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

export default async function main() {
  try {
    // Get text from clipboard
    const clipboardText = await Clipboard.read();
    const textContent = clipboardText.text ?? "";

    // Create filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const baseDir = path.join(homedir(), "clipboard_history");

    // Create directory if it doesn't exist
    await fs.mkdir(baseDir, { recursive: true });

    // Write to new file
    const filePath = path.join(baseDir, `${timestamp}.txt`);
    await fs.writeFile(filePath, textContent);

    await showHUD("Saved clipboard content to new file");
  } catch (error) {
    await showHUD("Failed to save clipboard content");
    console.error(error);
  }
}
