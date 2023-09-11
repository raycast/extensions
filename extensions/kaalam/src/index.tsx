import { Action, ActionPanel, Icon, List } from "@raycast/api";
import dayjs from "dayjs";

export default function Command() {
  // list all available date formats in a constant array
  const dateFormats = [
    "h:mm A",
    "h:mm:ss A",
    "MM/DD/YYYY",
    "MMMM D, YYYY",
    "MMMM D, YYYY h:mm A",
    "dddd, MMMM D, YYYY h:mm A",
    "M/D/YYYY",
    "MMM D, YYYY",
    "MMM D, YYYY h:mm A",
    "ddd, MMM D, YYYY h:mm A",
  ];
  const today = new Date();
  const items = dateFormats.map((format) => ({
    title: dayjs(today).format(format),
    subtitle: format,
  }));

  return (
    <List isLoading={false} searchBarPlaceholder="Filter by title...">
      {items.map((item, index) => (
        <List.Item
          key={index}
          icon="list-icon.png"
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ icon: Icon.Clock }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.title} />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        icon="list-icon.png"
        title={today.getTime().toString()}
        subtitle="Unix timestamp"
        accessories={[{ icon: Icon.Clock }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={today.getTime().toString()} />
          </ActionPanel>
        }
      />
    </List>
  );
}
