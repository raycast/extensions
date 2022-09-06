import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  openCommandPreferences,
  Icon,
} from "@raycast/api";
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
          accessories={getAccessories(item)}
          subtitle={item.description}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                content={new URL(`${username}/${item.slug}`, "https://cal.com").toString()}
                icon={Icon.Link}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getAccessories(item: CalEventType) {
  let accessories = [];
  if (item.hidden) {
    accessories.push({ icon: Icon.EyeDisabled, text: "Hidden" });
  }

  if (item.recurringEvent) {
    accessories.push({ icon: Icon.Repeat, text: `Repeats up to ${item.recurringEvent.count} times` });
  }

  if (item.requiresConfirmation) {
    accessories.push({ icon: Icon.QuestionMarkCircle, text: "Requires confirmation" });
  }

  accessories.push({ icon: Icon.Clock, text: `${item.length} min` });

  return accessories;
}
