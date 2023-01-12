import { Color, Icon, List } from "@raycast/api";
import { Issue } from "./types";
import { Actions } from "./Actions";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);

const SEPERATOR = "    ";

const numberFormatter = new Intl.NumberFormat(undefined, { notation: "compact" });
const timeFormatter = new TimeAgo("en-US");

function getFormattedCount(issue: Issue) {
  const formattedCount = numberFormatter.format(issue.count);
  return `🔄 ${formattedCount}`;
}

function getFormattedUserCount(issue: Issue) {
  const formattedUserCount = numberFormatter.format(issue.userCount);
  return `🧑 ${formattedUserCount}`;
}

function getFormattedLastSeen(issue: Issue) {
  const formattedLastSeen = timeFormatter.format(new Date(issue.lastSeen), "twitter");
  return `🕒 ${formattedLastSeen}`;
}

function getAccessories(issue: Issue) {
  const count = getFormattedCount(issue);
  const userCount = getFormattedUserCount(issue);
  const lastSeen = getFormattedLastSeen(issue);
  return `${count}${SEPERATOR}${userCount}${SEPERATOR}${lastSeen}`;
}

function getIcon(issue: Issue) {
  let tintColor: Color;

  switch (issue.level) {
    case "fatal":
      tintColor = Color.Red;
      break;
    case "error":
      tintColor = Color.Orange;
      break;
    case "warning":
      tintColor = Color.Yellow;
      break;
    case "info":
      tintColor = Color.Blue;
      break;
    case "debug":
      tintColor = Color.Purple;
      break;
    default:
      tintColor = Color.SecondaryText;
      break;
  }

  return { source: Icon.Circle, tintColor: tintColor };
}

export function IssueListItem(props: { issue: Issue }) {
  return (
    <List.Item
      icon={getIcon(props.issue)}
      title={props.issue.title}
      subtitle={props.issue.shortId}
      accessoryTitle={getAccessories(props.issue)}
      actions={<Actions issue={props.issue} />}
    />
  );
}
