import { open, showHUD, showInFinder } from "@raycast/api";
import { fetchItemInputClipboardFirst, fetchItemInputSelectedFirst } from "./utils/input-item";
import { checkIsFile, commonPreferences, isEmpty, isUrl, searchUrlBuilder, urlBuilder } from "./utils/common-utils";
import fse from "fs-extra";

export default async () => {
  const { priorityDetection, searchEngine } = commonPreferences();
  try {
    let path: string;
    if (priorityDetection === "selected") {
      path = await fetchItemInputSelectedFirst();
    } else {
      path = await fetchItemInputClipboardFirst();
    }
    if (isEmpty(path)) {
      await showHUD("No path detected");
      return;
    }
    if (!fse.existsSync(path)) {
      if (isUrl(path)) {
        await open(urlBuilder("https://", path));
        await showHUD("Open URL: " + path);
      } else {
        await open(searchUrlBuilder(searchEngine, path));
        await showHUD("Search: " + path);
      }
    } else {
      if (checkIsFile(path)) {
        await showInFinder(path);
        await showHUD("Show in Finder: " + path);
      } else {
        await open(path);
        await showHUD("Open Path: " + path);
      }
    }
  } catch (e) {
    await showHUD(String(e));
    console.error(String(e));
  }
};
