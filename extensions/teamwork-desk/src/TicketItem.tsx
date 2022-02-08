import { ActionPanel, List, OpenInBrowserAction, Color, Icon } from "@raycast/api";
import { formatDate, getUrl } from "./utils";

interface ItemData {
  id: number;
  isRead: boolean;
  subject: string;
  updatedAt: string;
  tasks: [] | null;
  inbox: { id: number } | [];
}

export default function TicketItem(props: {
  item: ItemData;
  inbox: { id: string | number; publicIconImage: string; name: string };
  index: number;
}) {
  return (
    <List.Item
      key={props.index}
      icon={
        props.item.isRead
          ? { source: Icon.Dot, tintColor: Color.SecondaryText }
          : { source: Icon.Dot, tintColor: Color.Green }
      }
      title={props.item.subject}
      subtitle={props.inbox.name ? props.inbox.name : ""}
      accessoryTitle={formatDate(props.item.updatedAt)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Ticket">
            <OpenInBrowserAction url={getUrl() + "/desk/tickets/" + props.item.id} />
          </ActionPanel.Section>
          {props.item.tasks ? (
            <ActionPanel.Section title="Tasks">
              {props.item.tasks?.map((task: { id: number }) => (
                <OpenInBrowserAction
                  key={task.id}
                  icon={Icon.Pin}
                  title={"#" + task.id}
                  url={getUrl() + "/#/tasks/" + task.id}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
