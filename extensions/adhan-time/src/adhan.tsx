import { MenuBarExtra, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import type { Prayers, Preferences } from "./prayer-types";
import { convertHours } from "../utils/convertHours";
import { fetchPrayers } from "../utils/fetchPrayers";
export default function Command() {
  const userPreference: Preferences = getPreferenceValues();
  const { isLoading, data: prayerTimes } = fetchPrayers();
  const prayers: Prayers | undefined = prayerTimes?.data.timings;
  return (
    <MenuBarExtra icon={Icon.Clock} title="Prayer times" tooltip="Prayer times" isLoading={isLoading}>
      {prayers &&
        Object.entries(prayers).map(([key, value]) => (
          <MenuBarExtra.Item
            key={key}
            title={`${key}: ${userPreference.twelve_hours_system === true ? convertHours(value) : value}`}
          />
        ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Change location Preferences"
          onAction={() => {
            openExtensionPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
