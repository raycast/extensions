import { Cache, showHUD } from "@raycast/api";
import { fetchItemInputClipboardFirst, fetchItemInputSelectedFirst } from "./input-item";
import { homedir } from "os";
import fse from "fs-extra";
import { isShowHud } from "../types/preference";

export const checkIsFile = (path: string) => {
  try {
    const stat = fse.lstatSync(path);
    return stat.isFile();
  } catch (e) {
    return false;
  }
};

export const isStartWithFileOrFolderStr = (path: string) => {
  return path.startsWith("file:///") || path.startsWith("~/") || path.startsWith(homedir());
};

export const getPathFromSelectionOrClipboard = async (priorityDetection: string) => {
  if (priorityDetection === "selected") {
    return await fetchItemInputSelectedFirst();
  } else {
    return await fetchItemInputClipboardFirst();
  }
};

export function isDeeplink(text: string): boolean {
  const deepLinkRegex = /^[a-zA-Z0-9-]+:\/\//;
  return deepLinkRegex.test(text) && !text.includes(" ");
}

export const urlBuilder = (prefix: string, text: string) => {
  return /^https?:\/\//g.test(text) ? text : `${prefix}${encodeURIComponent(text)}`;
};

enum SearchEngine {
  GOOGLE = "Google",
  BING = "Bing",
  BAIDU = "Baidu",
  BRAVE = "Brave",
  DUCKDUCKGO = "DuckDuckGo",
}

const searchEngines = [
  { title: "google", value: "https://google.com/search?q=" },
  { title: "bing", value: "https://www.bing.com/search?q=" },
  { title: "baidu", value: "https://www.baidu.com/s?wd=" },
  { title: "brave", value: "https://search.brave.com/search?q=" },
  { title: "duckduckgo", value: "https://duckduckgo.com/?q=" },
];

export const searchUrlBuilder = (searchEngine: string, text: string) => {
  switch (searchEngine) {
    case SearchEngine.GOOGLE: {
      return `${searchEngines[0].value}${encodeURIComponent(text)}`;
    }
    case SearchEngine.BING: {
      return `${searchEngines[1].value}${encodeURIComponent(text)}`;
    }
    case SearchEngine.BAIDU: {
      return `${searchEngines[2].value}${encodeURIComponent(text)}`;
    }
    case SearchEngine.BRAVE: {
      return `${searchEngines[3].value}${encodeURIComponent(text)}`;
    }
    case SearchEngine.DUCKDUCKGO: {
      return `${searchEngines[4].value}${encodeURIComponent(text)}`;
    }
    default: {
      return `${searchEngines[0].value}${encodeURIComponent(text)}`;
    }
  }
};

export const showHud = async (icon: string, content: string) => {
  if (isShowHud) {
    await showHUD(icon + " " + content);
  }
};

export const getArgument = (arg: string, argKey: string) => {
  const cache = new Cache({ namespace: "Args" });
  if (typeof arg !== "undefined") {
    // call from main window
    cache.set(argKey, arg);
    return arg;
  } else {
    // call from hotkey
    const cacheStr = cache.get(argKey);
    if (typeof cacheStr !== "undefined") {
      return cacheStr;
    } else {
      return "";
    }
  }
};
