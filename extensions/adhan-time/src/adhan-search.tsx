import { List, ActionPanel, Action, openExtensionPreferences, Color } from "@raycast/api";
import { convertHours } from "../utils/convertHours";
import { usePrayerTimes } from "../utils/usePrayerTimes";
import { getPrayerProperties } from "../utils/prayersProperties";
import { parseCountdown } from "../utils/parseCountdown";
import { sortPrayers } from "../utils/sortPrayers";

export default function Command() {
  const { isLoading, prayers, currentPrayer, countdown, userPreference } = usePrayerTimes();

  // Sort prayers to have the current prayer displayed first
  const sortedPrayers = prayers ? sortPrayers(prayers, currentPrayer) : [];

  return (
    <List isLoading={isLoading} navigationTitle="Prayer Name" searchBarPlaceholder="Search by prayer name">
      {sortedPrayers.map(([key, value]) => {
        const properties = getPrayerProperties(key);
        if (!properties) return null;

        const isCurrent = key === currentPrayer?.current && properties.isPrayer;
        const isNext = key === currentPrayer?.next;
        const timeLeftInMinutes = isCurrent ? parseCountdown(countdown) : 0;
        const color = timeLeftInMinutes > 30 ? Color.Green : timeLeftInMinutes > 10 ? Color.Orange : Color.Red;
        const icon = isCurrent ? { source: properties.icon, tintColor: color } : properties.icon;
        const prayerTime = userPreference.twelve_hours_system ? convertHours(value) : value;

        return (
          <List.Item
            key={key}
            title={properties.name}
            subtitle={prayerTime}
            icon={icon}
            accessories={
              isCurrent
                ? [{ tag: { value: `Time left: ${countdown}`, color: color } }, { tag: { value: "Current" } }]
                : isNext
                ? [{ tag: { value: "Next" } }]
                : undefined
            }
            keywords={isCurrent ? ["Current"] : isNext ? ["Next"] : []}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy to Clipboard" content={`${properties.name} time, ${prayerTime}`} />
                <Action
                  shortcut={{ modifiers: ["opt"], key: "," }}
                  onAction={() => openExtensionPreferences()}
                  title="Change Preferences"
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
