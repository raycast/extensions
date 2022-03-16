import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Activity, useActivity } from "./activity/hooks";
import { capitalize } from "./utils";

export default function Command() {
  const { activity, isLoading } = useActivity();

  return (
    <List isLoading={isLoading}>
      <List.Section title="Activity" subtitle={String(activity.length)}>
        {activity.map((result) => (
          <Item key={result.activityId + result.datetime} item={result} />
        ))}
      </List.Section>
    </List>
  );
}

function Item({ item }: { item: Activity }) {
  const relativeDate = formatDistanceToNow(parseISO(item.datetime), { addSuffix: true });
  return (
    <List.Item
      title={item.subject}
      subtitle={capitalize(item.objectType)}
      accessoryTitle={relativeDate}
      icon={getIcon(item.type)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={item.link} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getIcon(activityType: string) {
  let source: Icon = Icon.Dot;
  let tintColor: Color = Color.PrimaryText;
  switch (activityType) {
    case "file_changed":
      source = Icon.ArrowClockwise;
      break;
    case "file_created":
      source = Icon.Plus;
      tintColor = Color.Green;
      break;
    case "file_deleted":
      source = Icon.Trash;
      tintColor = Color.Red;
      break;
    case "calendar_todo":
      source = Icon.Checkmark;
      break;
    case "calendar_event":
      source = Icon.Calendar;
      break;
    case "security":
      source = Icon.Binoculars;
      break;
    case "card":
      source = Icon.Person;
      break;
    case "deck":
    case "deck_card_description":
      source = Icon.List;
      break;
    default:
      console.log("Unrecognized icon type:", activityType);
  }
  return { source, tintColor };
}
