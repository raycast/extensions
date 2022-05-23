import { getPreferenceValues, open, showHUD, showInFinder } from "@raycast/api";
import { fetchItemInputClipboardFirst, fetchItemInputSelectedFirst } from "./utils/input-item";
import { checkIsFile, isEmpty, isUrl, Preference, searchUrlBuilder, urlBuilder } from "./utils/common-utils";
import fse from "fs-extra";
import { homedir } from "os";
import { URL } from "url";

export default async () => {
  const { trimText, isShowHud, priorityDetection, searchEngine } = getPreferenceValues<Preference>();

  const _getText = await getPath(priorityDetection);
  const path = trimText ? _getText.trim() : _getText;

  if (isEmpty(path)) {
    await showHud(isShowHud, "No path detected");
    return "";
  }

  if (fse.pathExistsSync(path)) {
    await open(path);
    console.info("open(path)");
    return;
  }

  try {
    await open(new URL(path).toString());
    console.info("open(new URL(path).toString())");
    await showHud(isShowHud, "Open URL: " + path);
  } catch (e) {
    await reOpenURL(isShowHud, path, searchEngine);
    console.error(String(e));
  }
};

const showHud = async (showHud: boolean, content: string) => {
  if (showHud) {
    await showHUD(content);
  }
};

const getPath = async (priorityDetection: string) => {
  if (priorityDetection === "selected") {
    return await fetchItemInputSelectedFirst();
  } else {
    return await fetchItemInputClipboardFirst();
  }
};

const reOpenURL = async (isShowHud: boolean, rawPath: string, searchEngine: string) => {
  let finalPath = rawPath;
  if (rawPath.startsWith("~/")) {
    finalPath = rawPath.replace("~", homedir());
  }
  if (!fse.pathExistsSync(finalPath)) {
    if (isUrl(rawPath)) {
      await open(urlBuilder("https://", rawPath));
      console.info('open(urlBuilder("https://", rawPath))');
      await showHud(isShowHud, "Open URL: " + rawPath);
    } else {
      await open(searchUrlBuilder(searchEngine, rawPath));
      console.info("open(searchUrlBuilder(searchEngine, rawPath))");
      await showHud(isShowHud, "Search: " + rawPath);
    }
  } else {
    if (checkIsFile(finalPath)) {
      await showInFinder(finalPath);
      console.info("showInFinder(finalPath)");
      await showHud(isShowHud, "Show in Finder: " + finalPath);
    } else {
      await open(finalPath);
      console.info("open(finalPath)");
      await showHud(isShowHud, "Open Path: " + finalPath);
    }
  }
};
