import { List, ActionPanel, Action, openExtensionPreferences, Color, getPreferenceValues } from "@raycast/api";
import { calculateMinutesUntil, formatPrayerTime } from "../utils/dateTimeUtils";
import { usePrayerTimes } from "../utils/usePrayerTimes";

export default function Command() {
  const { isLoading, currentPeriod, countdown } = usePrayerTimes();
  const userPreference = getPreferenceValues();

  return (
    <List isLoading={isLoading} navigationTitle="Prayer Name" searchBarPlaceholder="Search by prayer name">
      {currentPeriod?.sortedTimings.map((prayer) => {
        const isCurrent = prayer.name === currentPeriod.current.name && prayer.type === "prayer";
        const isNext = prayer.name === currentPeriod.next.name;
        const timeLeftInMinutes = isCurrent ? calculateMinutesUntil(currentPeriod.next.time) : 0;
        const color = timeLeftInMinutes > 30 ? Color.Green : timeLeftInMinutes > 10 ? Color.Orange : Color.Red;
        const icon = isCurrent ? { source: prayer.icon, tintColor: color } : prayer.icon;
        const prayerTime = formatPrayerTime(prayer.time, userPreference.twelve_hours_system);

        return (
          <List.Item
            key={prayer.name}
            title={prayer.title}
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
                <Action.CopyToClipboard title="Copy to Clipboard" content={`${prayer.title} time, ${prayerTime}`} />
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
