import { getPreferenceValues, LocalStorage, showHUD } from "@raycast/api";
import Values = LocalStorage.Values;
import { fetchItemInputClipboardFirst, fetchItemInputSelectedFirst } from "./input-item";
import { homedir } from "os";
import fse from "fs-extra";

export interface Preference extends Values {
  trimText: boolean;
  isShowHud: boolean;
  fileOperation: string;
  priorityDetection: string;
  searchEngine: string;
}

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const checkIsFile = (path: string) => {
  try {
    const stat = fse.lstatSync(path);
    return stat.isFile();
  } catch (e) {
    return false;
  }
};

export const isFileOrFolderPath = (path: string) => {
  return path.startsWith("file:///") || path.startsWith("~/") || path.startsWith(homedir());
};

export const getPathFromSelectionOrClipboard = async (priorityDetection: string) => {
  if (priorityDetection === "selected") {
    return await fetchItemInputSelectedFirst();
  } else {
    return await fetchItemInputClipboardFirst();
  }
};

export function isEmail(text: string): boolean {
  const regex = /^[\da-zA-Z_.-]+@[\da-zA-Z_.-]+([.][a-zA-Z]+){1,2}$/;
  return regex.test(text);
}

export function isUrl(text: string): boolean {
  const regex = /^((http|https|ftp):\/\/)?((?:[\w-]+\.)+[a-z\d]+)((?:\/[^/?#]*)+)?(\?[^#]+)?(#.+)?$/i;
  return regex.test(text) || isIPUrl(text);
}

export function isIPUrl(text: string): boolean {
  return /^(http:\/\/)?(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/.test(
    text
  );
}

export function isIPUrlWithoutHttp(text: string): boolean {
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}/;

  return ipRegex.test(text);
}

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
  const { isShowHud } = getPreferenceValues<Preference>();
  if (isShowHud) {
    await showHUD(icon + " " + content);
  }
};
