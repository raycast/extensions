import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { environment, LaunchType } from "@raycast/api";

import type { MenuPullRequest } from "./types";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function formatDate(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date, "twitter") as string;
}

export const getTimestampISOInSeconds = () => new Date().toISOString().substring(0, 19) + "Z";

export const isActionUserInitiated = () => {
  const userInitiated = environment.launchType === LaunchType.UserInitiated;

  console.debug(`isActionUserInitiated: ${userInitiated}`);

  return userInitiated;
};

interface DataItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export const groupedByAttribute = (data: DataItem, attribute: string) =>
  data.reduce((acc: { [key: string]: DataItem[] }, obj: DataItem) => {
    const key = obj?.[attribute] ?? "";

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});

/** One menu section: an owner and the pull requests found under it. */
export type OwnerGroup = { owner: string; pulls: MenuPullRequest[] };

/**
 * Groups pull requests into the menu's owner sections.
 *
 * Every owner in scope gets a section, in the order it was configured, even
 * when nothing came back for it — an organization you selected going missing
 * reads as a bug, where an empty section reads as "nothing waiting here".
 * Owners outside the scope follow, so a pull request from elsewhere is never
 * dropped on the floor.
 */
export const groupPullsByOwner = (scopeOwners: string[], pulls: MenuPullRequest[]): OwnerGroup[] => {
  const groups = new Map<string, OwnerGroup>();

  for (const owner of scopeOwners) {
    if (owner) groups.set(owner.toLowerCase(), { owner, pulls: [] });
  }

  for (const pull of pulls) {
    const owner = pull.owner ?? "";
    const existing = groups.get(owner.toLowerCase());
    if (existing) existing.pulls.push(pull);
    else groups.set(owner.toLowerCase(), { owner: owner || "Unknown", pulls: [pull] });
  }

  return [...groups.values()];
};
