import { ActionPanel, Action, List, getPreferenceValues, showToast, Toast, openCommandPreferences } from "@raycast/api";
import { Preferences, useEventTypes } from "./services/cal.com";
import { URL } from "url";

const { username }: Preferences = getPreferenceValues();

export default function Command() {
  const { data: items, isLoading, error } = useEventTypes();

  if (error) {
    showToast({
      title: "Unable to load your events",
      message: "Check your API key",
      style: Toast.Style.Failure,
      primaryAction: { onAction: openCommandPreferences, title: "Open Preferences" },
    });
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
