import { List, ActionPanel, Action, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import type { Prayers, Preferences } from "./prayer-types";
import { convertHours } from "../utils/convertHours";
import { fetchPrayers } from "../utils/fetchPrayers";
export default function Command() {
  const userPreference: Preferences = getPreferenceValues();
  const { isLoading, data: prayerTimes } = fetchPrayers();

  const prayers: Prayers | undefined = prayerTimes?.data.timings;
  return (
    <List isLoading={isLoading} navigationTitle="Prayer Name" searchBarPlaceholder="Search by prayer name">
      {prayers &&
        Object.entries(prayers).map(([key, value]) => (
          <List.Item
            key={key}
            title={key}
            subtitle={userPreference.twelve_hours_system === true ? convertHours(value) : value}
            icon={Icon.Sun}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy to Clipboard"
                  content={`${key} time, ${userPreference.twelve_hours_system === true ? convertHours(value) : value}`}
                />
                <Action
                  shortcut={{ modifiers: ["opt"], key: "," }}
                  onAction={() => openExtensionPreferences()}
                  title="Change Preferences"
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
