import { BrowserExtension, Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

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

    // Create a cache directory for the webloc file following macOS specifications
    const cacheDir = join(homedir(), "Library", "Caches", "com.raycast.save-link");
    try {
      mkdirSync(cacheDir, { recursive: true });
    } catch {
      // Directory might already exist, that's fine
    }

    // Use custom title if provided, otherwise use page title
    const titleToUse = customTitle || activeTab.title || "Untitled";
    const safeTitle = titleToUse.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim().slice(0, 50);
    const filename = `${safeTitle || "Link"}.webloc`;
    const filePath = join(cacheDir, filename);

    // Create the webloc file content (XML plist format)
    const weblocContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>URL</key>
	<string>${activeTab.url}</string>
</dict>
</plist>`;

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
