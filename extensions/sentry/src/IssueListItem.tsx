import { Color, Icon, List } from "@raycast/api";
import { Issue } from "./types";
import { Actions } from "./Actions";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);

const numberFormatter = new Intl.NumberFormat(undefined, { notation: "compact" });
const timeFormatter = new TimeAgo("en-US");

function getEventsCount(issue: Issue): List.Item.Accessory {
  const formattedCount = numberFormatter.format(issue.count);
  return { icon: Icon.TwoArrowsClockwise, text: formattedCount };
}

function getAffectedUsersCount(issue: Issue): List.Item.Accessory {
  const formattedUserCount = numberFormatter.format(issue.userCount);
  return { icon: Icon.Person, text: formattedUserCount };
}

function getFormattedLastSeen(issue: Issue): List.Item.Accessory {
  const formattedLastSeen = timeFormatter.format(new Date(issue.lastSeen), "twitter");
  return { icon: Icon.Clock, text: `${formattedLastSeen}` };
}

function getAccessories(issue: Issue): List.Item.Accessory[] {
  const count = getEventsCount(issue);
  const userCount = getAffectedUsersCount(issue);
  const lastSeen = getFormattedLastSeen(issue);
  return [count, userCount, lastSeen];
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
      accessories={getAccessories(props.issue)}
      actions={<Actions issue={props.issue} />}
    />
  );
}
