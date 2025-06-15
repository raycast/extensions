import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { Issue } from "./types";
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
