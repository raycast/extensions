import { ItemType } from "./input";

export const SEARCH_ENGINE = {
  google: `https://google.com/search?q=`,
  bing: `https://www.bing.com/search?q=`,
  baidu: `https://www.baidu.com/s?wd=`,
  brave: `https://search.brave.com/search?q=`,
  duckduckgo: `https://duckduckgo.com/?q=`,
};

export const SUGGEST_APP_SUPPORT_TYPE = new Map<string, ItemType[]>([
  ["/Applications/Firefox.app", [ItemType.URL, ItemType.TEXT]],
  ["/Applications/Google Chrome.app", [ItemType.URL, ItemType.TEXT]],
  ["/Applications/Microsoft Edge.app", [ItemType.URL, ItemType.TEXT]],
  ["/Applications/Safari.app", [ItemType.URL, ItemType.TEXT]],
  ["/Applications/Opera.app", [ItemType.URL, ItemType.TEXT]],
  ["/Applications/Vivaldi.app", [ItemType.URL, ItemType.TEXT]],
  ["/Applications/Brave Browser.app", [ItemType.URL, ItemType.TEXT]],

  ["/Applications/Microsoft Outlook.app", [ItemType.EMAIL]],
  ["/Applications/Spark.app", [ItemType.EMAIL]],
  ["/System/Applications/Mail.app", [ItemType.EMAIL]],
  ["/Applications/Airmail.app", [ItemType.EMAIL]],
  ["/Applications/Mimestream.app", [ItemType.EMAIL]],
  ["/Applications/Edison Mail.app", [ItemType.EMAIL]],

  ["/Applications/Downie 4.app", [ItemType.URL]],
  ["/Applications/IINA.app", [ItemType.URL]],
  ["/Applications/Motrix.app", [ItemType.URL]],
  ["/Applications/Thunder.app", [ItemType.URL]],
  ["/System/Applications/App Store.app", [ItemType.TEXT]],
]);
