import { searchEngine } from "../types/preferences";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const isNotEmpty = (string: string | null | undefined) => {
  return !isEmpty(string);
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

export const searchUrlBuilder = (text: string) => {
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
