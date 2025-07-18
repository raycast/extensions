import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { writeFileSync } from "fs";
import { join } from "path";
import { createSafeFilename, createWeblocContent, ensureCacheDirectory, extractUrlFromText } from "./utils";

interface Arguments {
  title?: string;
}

export default async function main(props: LaunchProps<{ arguments: Arguments }>) {
  const { title: customTitle } = props.arguments;
  
  try {
    // Read clipboard content
    const clipboardContent = await Clipboard.read();
    
    if (!clipboardContent.text) {
      await showHUD("❌ No text found in clipboard");
      return;
    }

    // Extract URL from clipboard text
    const url = extractUrlFromText(clipboardContent.text);
    
    if (!url) {
      await showHUD("❌ No valid URL found in clipboard");
      return;
    }

    // Create cache directory
    const cacheDir = ensureCacheDirectory();

    // Use custom title if provided, otherwise use URL domain as title
    let titleToUse: string;
    if (customTitle) {
      titleToUse = customTitle;
    } else {
      try {
        const urlObj = new URL(url);
        titleToUse = urlObj.hostname.replace("www.", "");
      } catch {
        titleToUse = "Link";
      }
    }

    const safeTitle = createSafeFilename(titleToUse);
    const filename = `${safeTitle || "Link"}.webloc`;
    const filePath = join(cacheDir, filename);

    // Create the webloc file content
    const weblocContent = createWeblocContent(url);

    // Write the webloc file
    writeFileSync(filePath, weblocContent, "utf8");

    // Copy the file to clipboard
    const fileContent: Clipboard.Content = { file: filePath };
    await Clipboard.copy(fileContent);

    const titleSource = customTitle ? "custom title" : "domain name";
    await showHUD(`📋 Copied "${safeTitle}.webloc" to clipboard (using ${titleSource})`);
  } catch (error) {
    console.error("Error creating webloc file from clipboard:", error);
    await showHUD(`❌ Failed to create webloc file: ${error instanceof Error ? error.message : String(error)}`);
  }
}
