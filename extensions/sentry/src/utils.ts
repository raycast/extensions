import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { Issue, Release } from "./types";
import { getAvatarIcon } from "@raycast/utils";

const { url } = getPreferenceValues();

const numberFormatter = new Intl.NumberFormat(undefined, { notation: "compact" });

export function getFormattedEventsCount(issue: Issue) {
  return numberFormatter.format(issue.count);
}

export function getFormattedAffectedUsersCount(issue: Issue) {
  return numberFormatter.format(issue.userCount);
}

export function getAssigneeIcon(issue: Issue) {
  return issue.assignedTo ? getAvatarIcon(issue.assignedTo.name) : Icon.PersonCircle;
}

export function getAccessories(issue: Issue): List.Item.Accessory[] {
  const eventsCount = getFormattedEventsCount(issue);
  const affectedUsersCount = getFormattedAffectedUsersCount(issue);
  const assigneeIcon = getAssigneeIcon(issue);

  return [
    { icon: Icon.ArrowClockwise, text: eventsCount, tooltip: `Events: ${issue.count}` },
    issue.userCount
      ? { icon: Icon.Person, text: affectedUsersCount, tooltip: `Affected Users: ${issue.userCount}` }
      : null,
    { icon: Icon.Clock, date: new Date(issue.lastSeen), tooltip: `Last Seen: ${issue.lastSeen.toLocaleString()}` },
    issue.assignedTo
      ? {
          icon: assigneeIcon,
          tooltip: `Assignee: ${issue.assignedTo.name}`,
        }
      : null,
  ].filter(isTruthy);
}

export function isTruthy<T>(value: T | null | undefined): value is T {
  return Boolean(value);
}

export function getIcon(issue: Issue) {
  let tintColor: Color;
  let level: string;

  switch (issue.level) {
    case "fatal":
      tintColor = Color.Red;
      level = "Fatal";
      break;
    case "error":
      tintColor = Color.Orange;
      level = "Error";
      break;
    case "warning":
      tintColor = Color.Yellow;
      level = "Warning";
      break;
    case "info":
      tintColor = Color.Blue;
      level = "Info";
      break;
    case "debug":
      tintColor = Color.Purple;
      level = "Debug";
      break;
    default:
      tintColor = Color.SecondaryText;
      level = "Unknown";
      break;
  }

  return { value: { source: Icon.Circle, tintColor: tintColor }, tooltip: `Level: ${level}` };
}

export function getKeywords(issue: Issue) {
  const keywords: string[] = [issue.shortId];
  if (issue.assignedTo?.name) {
    keywords.push(issue.assignedTo.name);
  }
  return keywords;
}

export function getDefaultBaseUrl() {
  return url.replace(/\/$/, "") || "https://sentry.io";
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function getCrashFreeRate(release: Release): number | undefined {
  return release.projects?.[0]?.healthData?.crashFreeSessions ?? undefined;
}

export function getCrashFreeIcon(rate?: number): { source: Icon; tintColor: Color } {
  if (rate === undefined) {
    return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
  }
  if (rate >= 99) {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (rate >= 95) {
    return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
  }
  return { source: Icon.XMarkCircle, tintColor: Color.Red };
}

export function getReleaseAccessories(release: Release): List.Item.Accessory[] {
  const crashFreeRate = getCrashFreeRate(release);
  const date = release.dateReleased || release.dateCreated;

  return [
    release.newGroups > 0
      ? {
          icon: Icon.Bug,
          text: `${release.newGroups}`,
          tooltip: `New Issues: ${release.newGroups}`,
        }
      : null,
    crashFreeRate !== undefined
      ? {
          icon: getCrashFreeIcon(crashFreeRate),
          text: formatPercent(crashFreeRate),
          tooltip: `Crash Free Sessions: ${formatPercent(crashFreeRate)}`,
        }
      : null,
    { icon: Icon.Calendar, date: new Date(date), tooltip: `Released: ${date}` },
  ].filter(isTruthy);
}

export function getReleaseUrl(release: Release, orgSlug?: string): string {
  if (!orgSlug) {
    return "";
  }
  const baseUrl = release.baseUrl || "https://sentry.io";
  const projectSlug = release.projects?.[0]?.slug;
  const version = encodeURIComponent(release.version);
  if (projectSlug) {
    return `${baseUrl}/organizations/${orgSlug}/releases/${version}/?project=${projectSlug}`;
  }
  return `${baseUrl}/organizations/${orgSlug}/releases/${version}/`;
}
