import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { Preferences, useEventTypes } from "./services/cal.com";
import { URL } from "url";

const { username }: Preferences = getPreferenceValues();

export default function Command() {
  const { data: items, isLoading, error } = useEventTypes();

  if (error) {
    console.log(error);
  }

  return (
    <List isLoading={isLoading}>
      {items?.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.description}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={new URL(`${username}/${item.slug}`, "https://cal.com").toString()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
