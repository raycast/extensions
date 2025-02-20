import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import Fuse, { FuseOptionKey } from "fuse.js";
import _ from "lodash";
import osascript from "osascript-tag";
import { URL } from "url";
import { langAdaptor } from "./lang-adaptor";
import { HistoryItem, LooseTab } from "./types";
import { runAppleScript } from "@raycast/utils";

export const { safariAppIdentifier }: Preferences = getPreferenceValues();

export const executeJxa = async (script: string) => {
  try {
    return await osascript.jxa({ parse: true })`${script}`;
  } catch (err: unknown) {
    if (typeof err === "string") {
      const message = err.replace("execution error: Error: ", "");
      if (message.match(/Application can't be found/)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Application not found",
          message: "Things must be running",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: message,
        });
      }
    }
  }
};

const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch (err) {
    return null;
  }
};

export const getTabUrl = (url: string) => {
  const parsedUrl = parseUrl(url);

  // Extract URL from suspended tabs (Tab Suspender for Safari)
  if (parsedUrl && parsedUrl.protocol === "safari-extension:" && parsedUrl.searchParams.has("url")) {
    return parsedUrl.searchParams.get("url") || url;
  }

  return url;
};

export const getUrlDomain = (url: string) => {
  const parsedUrl = parseUrl(url);
  if (parsedUrl && parsedUrl.hostname) {
    return parsedUrl.hostname.replace(/^www\./, "");
  }
};

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const getTitle = (tab: LooseTab) => _.truncate(tab.title, { length: 75 });

export const plural = (count: number, string: string) => `${count} ${string}${count > 1 ? "s" : ""}`;

function installLangHandlers() {
  const enablePinyin = getPreferenceValues<Preferences>().enablePinyin;
  if (enablePinyin) {
    import("./lang-adaptor/pinyin").then((pinyinModule) => {
      const pinyinHandler = new pinyinModule.PinyinHandler();
      langAdaptor.registerLang(pinyinHandler.name, pinyinHandler);
    });
  }
}

export const search = function (collection: LooseTab[], keys: Array<FuseOptionKey<object>>, searchText: string) {
  installLangHandlers();

  if (!searchText) {
    return collection;
  }

  const _formatPerf = performance.now();
  const formattedCollection = collection.map((item) => {
    return {
      ...item,
      title_formatted: langAdaptor.formatString(searchText, item.title, { id: item.uuid }),
    };
  });
  const _formatCost = performance.now() - _formatPerf;

  const _searchPerf = performance.now();
  const result = new Fuse(formattedCollection, { keys, threshold: 0.35 }).search(searchText).map((x) => x.item);
  const _searchCost = performance.now() - _searchPerf;

  if (process.env.NODE_ENV === "development") {
    console.log("searchText", searchText);
    console.log(`format cost ${_formatCost}ms`);
    console.log(`search cost ${_searchCost}ms`);
    // console.log('formatted collection', formattedCollection);
    console.log("result size", result.length);
  }
  return result;
};

const dtf = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export const groupHistoryByDay = (groups: Map<string, HistoryItem[]>, entry: HistoryItem) => {
  const date = dtf.format(new Date(entry.lastVisited));
  if (!date) {
    return groups;
  }

  const group = groups.get(date) ?? [];
  group.push(entry);
  groups.set(date, group);
  return groups;
};

export async function getCurrentTabName() {
  return await runAppleScript(`tell application "${safariAppIdentifier}" to return name of front document`);
}

export async function getCurrentTabURL() {
  return await runAppleScript(`tell application "${safariAppIdentifier}" to return URL of front document`);
}
