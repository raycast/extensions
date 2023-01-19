import { getPreferenceValues, open, showHUD, showInFinder } from "@raycast/api";
import { fetchItemInputClipboardFirst, fetchItemInputSelectedFirst } from "./utils/input-item";
import { checkIsFile, isEmail, isEmpty, isUrl, Preference, searchUrlBuilder, urlBuilder } from "./utils/common-utils";
import fse from "fs-extra";
import { homedir } from "os";
import { URL } from "url";
import { isIPv4 } from "net";

export default async () => {
  const { trimText, isShowHud, fileOperation, priorityDetection, searchEngine } = getPreferenceValues<Preference>();

  const _getText = await getPath(priorityDetection);
  const path = trimText ? _getText.trim() : _getText;

  if (isEmpty(path)) {
    await showHud(isShowHud, "No path detected");
    return "";
  }
  if (fse.pathExistsSync(path)) {
    await filePathOperation(path, fileOperation, isShowHud);
    return;
  }

  if (isIPv4(path)) {
    if (path == "127.0.0.1") {
      await open("http://www." + path);
    } else {
      await open("http://" + path);
    }
    console.info("open: IP address");
    await showHud(isShowHud, "Open IP: " + path);
    return;
  }

  if (isEmail(path)) {
    await open("mailto:" + path);
    console.info("open: email");
    await showHud(isShowHud, "Send Email: " + path);
    return;
  }

  try {
    await open(new URL(path).toString());
    console.info("open: URL");
    await showHud(isShowHud, "Open URL: " + path);
  } catch (e) {
    await reOpenURL(fileOperation, isShowHud, path, searchEngine);
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

export const filePathOperation = async (path: string, fileOperation: string, isShowHud: boolean) => {
  if (fileOperation === "showInFinder" && checkIsFile(path)) {
    await showInFinder(path);
    console.info("showInFinder(finalPath)");
    await showHud(isShowHud, "Show in Finder: " + path);
  } else {
    await open(path);
    console.info("open(finalPath)");
    await showHud(isShowHud, "Open Path: " + path);
  }
};

const reOpenURL = async (fileOperation: string, isShowHud: boolean, rawPath: string, searchEngine: string) => {
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
    await filePathOperation(finalPath, fileOperation, isShowHud);
  }
};
