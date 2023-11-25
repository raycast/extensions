import _ from "lodash";
import osascript from "osascript-tag";
import { URL } from "url";

import { showToast, Toast, getPreferenceValues } from "@raycast/api";

import { HistoryItem, Tab } from "./types";

type Preferences = {
  safariAppIdentifier: string;
};

export const { safariAppIdentifier }: Preferences = getPreferenceValues();

export const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: true })`${script}`;
    return result;
  } catch (err: unknown) {
    if (typeof err === "string") {
      const message = err.replace("execution error: Error: ", "");
      if (message.match(/Application can't be found/)) {
        showToast({
          style: Toast.Style.Failure,
          title: "Application not found",
          message: "Things must be running",
        });
      } else {
        showToast({
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

export const getTitle = (tab: Tab) => _.truncate(tab.title, { length: 75 });

export const plural = (count: number, string: string) => `${count} ${string}${count > 1 ? "s" : ""}`;

const normalizeText = (text: string) =>
  (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const search = (collection: object[], keys: string[], searchText: string) =>
  _.filter(collection, (item) =>
    _.some(keys, (key) => normalizeText(_.get(item, key)).includes(normalizeText(searchText)))
  );

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

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export const isPermissionError = (error: unknown) => {
  return error instanceof Error && error.name === "PermissionError";
};
