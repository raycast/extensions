import { getPreferenceValues, open, showHUD, showInFinder } from "@raycast/api";
import { fetchItemInputClipboardFirst, fetchItemInputSelectedFirst } from "./utils/input-item";
import { checkIsFile, isEmpty, isUrl, Preference, searchUrlBuilder, urlBuilder } from "./utils/common-utils";
import fse from "fs-extra";
import { homedir } from "os";

export default async () => {
  const { priorityDetection, searchEngine } = getPreferenceValues<Preference>();
  try {
    let rawPath: string;
    let newPath: string;
    if (priorityDetection === "selected") {
      rawPath = await fetchItemInputSelectedFirst();
    } else {
      rawPath = await fetchItemInputClipboardFirst();
    }
    if (isEmpty(rawPath)) {
      await showHUD("No path detected");
      return;
    }
    newPath = rawPath;
    if (rawPath.startsWith("~/")) {
      newPath = rawPath.replace("~", homedir());
    }
    if (!fse.existsSync(newPath)) {
      if (isUrl(rawPath)) {
        await open(urlBuilder("https://", rawPath));
        await showHUD("Open URL: " + rawPath);
      } else {
        await open(searchUrlBuilder(searchEngine, rawPath));
        await showHUD("Search: " + rawPath);
      }
    } else {
      if (checkIsFile(newPath)) {
        await showInFinder(newPath);
        await showHUD("Show in Finder: " + newPath);
      } else {
        await open(newPath);
        await showHUD("Open Path: " + newPath);
      }
    }
  } catch (e) {
    await showHUD(String(e));
    console.error(String(e));
  }
};
