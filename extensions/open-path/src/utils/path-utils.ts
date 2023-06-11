import { checkIsFile, isUrl, searchUrlBuilder, showHud, urlBuilder } from "./common-utils";
import { open, showInFinder } from "@raycast/api";

export const filePathOperation = async (path: string, fileOperation: string) => {
  const icon = checkIsFile(path) ? "📄" : "📂";
  if (fileOperation === "showInFinder") {
    await showInFinder(path);
    console.info("showInFinder " + path);
    await showHud(icon, "Show: " + path);
  } else {
    await open(path);
    console.info("open " + path);
    await showHud(icon, "Open: " + path);
  }
};

export const OpenURL = async (fileOperation: string, path: string, searchEngine: string) => {
  try {
    if (isUrl(path)) {
      await open(urlBuilder("https://", path));
      console.info("open " + urlBuilder("https://", path));
      await showHud("🔗", "Open URL: " + path);
    } else {
      // Underwriting strategy, execution search
      await open(searchUrlBuilder(searchEngine, path));
      console.info("open " + searchUrlBuilder(searchEngine, path));
      await showHud("🔍", "Search: " + path);
    }
  } catch (e) {
    await showHud("🚫", "Error: " + e);
  }
};
