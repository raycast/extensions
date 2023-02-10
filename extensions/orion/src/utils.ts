import { homedir } from "os";
import { URL } from "url";
import { HistoryItem } from "src/types";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";

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
  return join(homedir(), "/Library/Application Support", getPreferenceValues()["orion-rc"] ? "Orion RC" : "Orion");
}
