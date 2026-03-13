import { open, showHUD } from "@raycast/api";
import { ensureCacheDirectory } from "./utils";

export default async function main() {
  try {
    // Get the cache directory path
    const cacheDir = ensureCacheDirectory();

    // Open the directory in Finder
    await open(cacheDir);

    // Show success message
    await showHUD("📂 Opened cached links directory");
  } catch (error) {
    console.error("Error opening save folder:", error);
    await showHUD(`❌ Failed to open save folder: ${error instanceof Error ? error.message : String(error)}`);
  }
}
