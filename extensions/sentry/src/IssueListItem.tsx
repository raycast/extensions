import { Color, Icon, List } from "@raycast/api";
import { Issue } from "./types";
import { Actions } from "./Actions";
import { getAvatarIcon } from "@raycast/utils";

const numberFormatter = new Intl.NumberFormat(undefined, { notation: "compact" });

function getEventsAccessory(issue: Issue): List.Item.Accessory {
  const formattedCount = numberFormatter.format(issue.count);
  return { icon: Icon.ArrowClockwise, text: formattedCount, tooltip: `Events: ${issue.count}` };
}

function getAffectedUsersAccessory(issue: Issue): List.Item.Accessory {
  const formattedUserCount = numberFormatter.format(issue.userCount);
  return { icon: Icon.Person, text: formattedUserCount, tooltip: `Affected Users: ${issue.userCount}` };
}

function getLastSeenAccessory(issue: Issue): List.Item.Accessory {
  const date = new Date(issue.lastSeen);
  return { icon: Icon.Clock, date, tooltip: `Last Seen: ${date.toLocaleString()}` };
}

function getAssigneeAccessory(issue: Issue): List.Item.Accessory {
  return {
    icon: issue.assignedTo ? getAvatarIcon(issue.assignedTo.name) : Icon.PersonCircle,
    tooltip: issue.assignedTo ? `Assignee: ${issue.assignedTo.name}` : "Unassigned",
  };
}

function getAccessories(issue: Issue): List.Item.Accessory[] {
  const count = getEventsAccessory(issue);
  const userCount = getAffectedUsersAccessory(issue);
  const lastSeen = getLastSeenAccessory(issue);
  const assignee = getAssigneeAccessory(issue);
  return [count, userCount, lastSeen, assignee];
}

function getIcon(issue: Issue) {
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

function getKeywords(issue: Issue) {
  return issue.assignedTo ? [issue.assignedTo.name] : undefined;
}

export function IssueListItem(props: { issue: Issue }) {
  return (
    <List.Item
      icon={getIcon(props.issue)}
      title={props.issue.title}
      subtitle={props.issue.shortId}
      keywords={getKeywords(props.issue)}
      accessories={getAccessories(props.issue)}
      actions={<Actions issue={props.issue} />}
    />
  );
}
