// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Icon, MenuBarExtra, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { PrayerTime, loadTodaySolat } from "./lib/prayer-times";

export default function Command() {
  const userPreference: Preferences = getPreferenceValues();
  const [isLoading, setLoading] = useState(true);
  const [prayerTime, setPrayerTime] = useState<PrayerTime>();

  async function onZoneChange() {
    setPrayerTime(await loadTodaySolat(userPreference.zone));
    setLoading(false);
  }

  useEffect(() => {
    onZoneChange();
  }, []);

  return (
    <MenuBarExtra icon={Icon.Moon} title="Waktu Solat" tooltip="Waktu Solat" isLoading={isLoading}>
      {/* <MenuBarExtra.Section title={userPreference.zone}> */}
      {prayerTime?.items?.map((item) => (
        <MenuBarExtra.Item key={item.label} title={`${item.label}: `} subtitle={item.value} />
      ))}
      {/* </MenuBarExtra.Section> */}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Change zone" onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
