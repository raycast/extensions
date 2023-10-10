import { Icon, MenuBarExtra, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { PrayerTime, loadTodaySolat } from "./lib/prayer-times";

export default function Command() {
  const userPreference: Preferences = getPreferenceValues();
  const [isLoading, setLoading] = useState(true);
  const [prayerTime, setPrayerTime] = useCachedState<PrayerTime>("cache");

  useEffect(() => {
    (async () => {
      setPrayerTime(await loadTodaySolat(userPreference.zone));
      setLoading(false);
    })();
  }, []);

  return (
    <MenuBarExtra icon={Icon.Moon} title="Waktu Solat" tooltip="Waktu Solat" isLoading={isLoading}>
      {prayerTime?.items?.map((item) => (
        <MenuBarExtra.Item key={item.label} title={`${item.label}: `} subtitle={item.value} />
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Change Zone"
          icon={Icon.Cog}
          onAction={() => openExtensionPreferences()}
          shortcut={{ modifiers: ["cmd"], key: "," }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
