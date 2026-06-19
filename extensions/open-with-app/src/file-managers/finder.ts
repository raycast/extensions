import { getSelectedFinderItems } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import type { FileManagerProvider } from "./types";

async function getBackgroundFinderPaths(): Promise<string[]> {
  const paths = (await runAppleScript(`
    tell application "Finder"
      set selectedItems to selection
      set selectedPaths to {}

      repeat with selectedItem in selectedItems
        set selectedItemPath to POSIX path of (selectedItem as text)
        set end of selectedPaths to selectedItemPath
      end repeat

      return selectedPaths as list
    end tell
  `)) as string;
  if (paths.length === 0) return [];
  return paths.split(", ");
}

export class FinderProvider implements FileManagerProvider {
  readonly name = "Finder";
  readonly bundleId = "com.apple.finder";

  async getSelectedPaths(): Promise<string[]> {
    try {
      const items = await getSelectedFinderItems();
      return items.map((item) => item.path);
    } catch {
      return getBackgroundFinderPaths();
    }
  }
}
