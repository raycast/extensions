import { homedir } from "os";
import { URL } from "url";
import { HistoryItem, Tab } from "src/types";
import { join } from "path";
import { Color, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

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
  return join(homedir(), "Library", "Application Support", getOrionAppIdentifier());
}

export function getOrionAppIdentifier() {
  return getPreferenceValues()["orion-rc"] ? "Orion RC" : "Orion";
}

export function getFavoritesPath(profile: string) {
  const profileFolder = profile;
  return join(getOrionBasePath(), profileFolder, "favourites.plist");
}

export function getHistoryPath(profile: string) {
  const profileFolder = profile;
  return join(getOrionBasePath(), profileFolder, "history");
}

export function getReadingListPath(profile: string) {
  const profileFolder = profile;
  return join(getOrionBasePath(), profileFolder, "reading_list.plist");
}

export function getProfilesPath() {
  return join(getOrionBasePath(), "profiles");
}

export const executeJxa = async (script: string) => {
  try {
    return await runAppleScript(script, { language: "JavaScript", humanReadableOutput: false });
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
    keys.some((key) => normalizeText((item as Record<string, string>)[key]).includes(normalizeText(searchText))),
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

export const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch (err) {
    return null;
  }
};

export const idToColor = (id: number) => {
  switch (id) {
    case 0:
      return "#98989D";
    case 1:
      return "#CC66FF";
    case 2:
      return "#F7509E";
    case 3:
      return "#FF5045";
    case 4:
      return "#FFA915";
    case 5:
      return "#FFE018";
    case 6:
      return "#3EFD56";
    case 7:
      return "#A2A2A7";
  }
  return Color.PrimaryText;
};
