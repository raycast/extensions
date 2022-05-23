import fse from "fs-extra";
import { LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;

export interface Preference extends Values {
  trimText: boolean;
  isShowHud: boolean;
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

export function isUrl(text: string): boolean {
  const regex = /^((http|https|ftp):\/\/)?((?:[\w-]+\.)+[a-z\d]+)((?:\/[^/?#]*)+)?(\?[^#]+)?(#.+)?$/i;
  return regex.test(text) || isIP(text);
}

export function isIP(text: string): boolean {
  return /^(http:\/\/)?(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/.test(
    text
  );
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
