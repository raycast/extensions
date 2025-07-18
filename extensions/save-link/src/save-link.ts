import { BrowserExtension, Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { writeFileSync } from "fs";
import { join } from "path";
import { createSafeFilename, createWeblocContent, ensureCacheDirectory } from "./utils";

interface Arguments {
  title?: string;
}

export default async function main(props: LaunchProps<{ arguments: Arguments }>) {
  const { title: customTitle } = props.arguments;
  
  try {
    // Get the active browser tab
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find(tab => tab.active);
    
    if (!activeTab || !activeTab.url) {
      await showHUD("❌ No active browser tab found");
      return;
    }

    // Create cache directory
    const cacheDir = ensureCacheDirectory();

    // Use custom title if provided, otherwise use page title
    const titleToUse = customTitle || activeTab.title || "Untitled";
    const safeTitle = createSafeFilename(titleToUse);
    const filename = `${safeTitle || "Link"}.webloc`;
    const filePath = join(cacheDir, filename);

    // Create the webloc file content
    const weblocContent = createWeblocContent(activeTab.url);

    // Write the webloc file
    writeFileSync(filePath, weblocContent, "utf8");

    // Copy the file to clipboard
    const fileContent: Clipboard.Content = { file: filePath };
    await Clipboard.copy(fileContent);

    const titleSource = customTitle ? "custom title" : "page title";
    await showHUD(`📋 Copied "${safeTitle}.webloc" to clipboard (using ${titleSource})`);
  } catch (error) {
    console.error("Error creating webloc file:", error);
    await showHUD(`❌ Failed to create webloc file: ${error instanceof Error ? error.message : String(error)}`);
  }
}
