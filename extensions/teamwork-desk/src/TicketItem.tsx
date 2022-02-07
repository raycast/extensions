import { ActionPanel, List, OpenInBrowserAction, getPreferenceValues, Color, Icon } from "@raycast/api";
import { formatDate } from "./utils";
interface Preferences {
  domain: string;
  apikey: string;
}
const preferences: Preferences = getPreferenceValues();

export default function TicketItem(props: { item: any; inbox: any; index: number }) {
  return (
    <List.Item
      key={props.item.id}
      icon={
        props.inbox.publicIconImage != ""
          ? props.item.isRead
            ? { source: Icon.Dot, tintColor: Color.SecondaryText }
            : { source: Icon.Dot, tintColor: Color.Green }
          : "list-icon.png"
      }
      title={props.item.subject}
      subtitle={props.inbox.name}
      accessoryTitle={formatDate(props.item.updatedAt)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Ticket">
            <OpenInBrowserAction
              url={"https://" + preferences.domain + ".teamwork.com/desk/tickets/" + props.item.id}
            />
          </ActionPanel.Section>
          {props.item.tasks ? (
            <ActionPanel.Section title="Tasks">
              {props.item.tasks?.map((task: any, index: number) => (
                <OpenInBrowserAction
                  key={task.id}
                  icon={Icon.Pin}
                  title={"#" + task.id}
                  url={"https://" + preferences.domain + ".teamwork.com/#/tasks/" + task.id}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
