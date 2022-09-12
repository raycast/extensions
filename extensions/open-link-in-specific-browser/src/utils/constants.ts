import { AppType } from "../types/types";

export const SEARCH_ENGINE = {
  google: `https://google.com/search?q=`,
  bing: `https://www.bing.com/search?q=`,
  baidu: `https://www.baidu.com/s?wd=`,
  brave: `https://search.brave.com/search?q=`,
  duckduckgo: `https://duckduckgo.com/?q=`,
};

export const suggestApps = [
  { path: "/Applications/Safari.app", type: AppType.BROWSER, rank: 1 },
  { path: "/Applications/Google Chrome.app", type: AppType.BROWSER, rank: 2 },
  { path: "/Applications/Microsoft Edge.app", type: AppType.BROWSER, rank: 3 },
  { path: "/Applications/Firefox.app", type: AppType.BROWSER, rank: 4 },
  { path: "/Applications/Opera.app", type: AppType.BROWSER, rank: 5 },
  { path: "/Applications/Vivaldi.app", type: AppType.BROWSER, rank: 6 },
  { path: "/Applications/Brave Browser.app", type: AppType.BROWSER, rank: 7 },
  { path: "/Applications/Orion.app", type: AppType.BROWSER, rank: 8 },
  { path: "/Applications/SigmaOS.app", type: AppType.BROWSER, rank: 9 },
  { path: "/Applications/Slidepad.app", type: AppType.BROWSER, rank: 10 },
  { path: "/Applications/Min.app", type: AppType.BROWSER, rank: 11 },

  { path: "/System/Applications/Mail.app", type: AppType.EMAIL_CLIENT, rank: 101 },
  { path: '/Applications/Spark.app"', type: AppType.EMAIL_CLIENT, rank: 102 },
  { path: "/Applications/Microsoft Outlook.app", type: AppType.EMAIL_CLIENT, rank: 103 },
  { path: "/Applications/Airmail.app", type: AppType.EMAIL_CLIENT, rank: 104 },
  { path: "/Applications/Mimestream.app", type: AppType.EMAIL_CLIENT, rank: 105 },
  { path: "/Applications/Edison Mail.app", type: AppType.EMAIL_CLIENT, rank: 106 },

  { path: "/System/Applications/App Store.app", type: AppType.OTHER, rank: 201 },
  { path: "/Applications/Downie 4.app", type: AppType.OTHER, rank: 202 },
  { path: "/Applications/IINA.app", type: AppType.OTHER, rank: 203 },
  { path: "/Applications/Motrix.app", type: AppType.OTHER, rank: 204 },
  { path: "/Applications/Thunder.app", type: AppType.OTHER, rank: 205 },
];
