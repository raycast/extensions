import { Action, ActionPanel, Icon, List } from "@raycast/api";
import dayjs from "dayjs";

export default function Command() {
  // list all available date formats in a constant array
  const twelveHourDateFormats = [
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
  const items12 = twelveHourDateFormats.map((format) => ({
    title: dayjs(today).format(format),
    subtitle: format,
  }));

  const twentyFourHourDateFormats = [
    "H:mm",
    "H:mm:ss",
    "MM/DD/YYYY",
    "MMMM D, YYYY",
    "MMMM D, YYYY H:mm",
    "dddd, MMMM D, YYYY H:mm",
    "M/D/YYYY",
    "MMM D, YYYY",
    "MMM D, YYYY H:mm",
    "ddd, MMM D, YYYY H:mm",
  ];
  const items24 = twentyFourHourDateFormats.map((format) => ({
    title: dayjs(today).format(format),
    subtitle: format,
  }));

  const iso8601Formats = ["YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DDTHH:mm:ssZ", "YYYYMMDDTHHmmss[Z]"];
  const itemsISO8601 = iso8601Formats.map((format) => ({
    title: dayjs().format(format),
    subtitle: format,
  }));

  return (
    <List isLoading={false} searchBarPlaceholder="Filter by title...">
      <List.Section title="12-hour formats">
        {items12.map((item, index) => (
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
      </List.Section>
      <List.Section title="24-hour formats">
        {items24.map((item, index) => (
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
      </List.Section>
      <List.Section title="ISO 8601">
        {itemsISO8601.map((item, index) => (
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
      </List.Section>
      <List.Section title="Unix timestamp">
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
      </List.Section>
    </List>
  );
}
