import { homedir } from "os";
import { URL } from "url";
import { HistoryItem, Tab } from "src/types";
import { join } from "path";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import osascript from "osascript-tag";

export function extractDomainName(urlString: string) {
  try {
    const url = new URL(urlString);
    return url.host.replace("www.", "");
  } catch {
    return "";
  }
}

export function unique(strings: string[]) {
  return strings.filter((str, index) => strings.indexOf(str) === index);
}

const dtf = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function groupHistoryByDay(groups: Map<string, HistoryItem[]>, entry: HistoryItem) {
  const date = dtf.format(new Date(entry.lastVisitDate));
  if (!date) {
    return groups;
  }

  const group = groups.get(date) ?? [];
  group.push(entry);
  groups.set(date, group);
  return groups;
}

export function getOrionBasePath() {
  return join(homedir(), "/Library/Application Support", getOrionAppIdentifier());
}

export function getOrionAppIdentifier() {
  return getPreferenceValues()["orion-rc"] ? "Orion RC" : "Orion";
}

export const executeJxa = async (script: string) => {
  try {
    return await osascript.jxa({ parse: true })`${script}`;
  } catch (err: unknown) {
    console.log(err);
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

const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function search<T extends object>(collection: T[], keys: string[], searchText: string): T[] {
  return collection.filter((item) =>
    keys.some((key) => normalizeText((item as Record<string, string>)[key]).includes(normalizeText(searchText)))
  );
}

export function getTitle(tab: Tab) {
  let truncated = tab.title.substring(0, 75);
  if (truncated.length < tab.title.length) {
    truncated += "...";
  }
  return truncated;
}

export const getUrlDomain = (url: string) => {
  const parsedUrl = parseUrl(url);
  if (parsedUrl && parsedUrl.hostname) {
    return parsedUrl.hostname.replace(/^www\./, "");
  }
};

const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch (err) {
    return null;
  }
};
