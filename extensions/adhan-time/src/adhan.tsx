import { MenuBarExtra, getPreferenceValues, Icon, openCommandPreferences, Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
export interface Preferences {
  country: string;
  city: string;
  calculation_methods: string;
}
export interface Data {
  data: {
    timings: {
      Fajr: string;
      Sunrise: string;
      Dhuhr: string;
      Asr: string;
      Maghrib: string;
      Isha: string;
    };
  };
  calculation_methods: string;
}
export default function Command() {
  const userPreference: Preferences = getPreferenceValues();
  const { isLoading, data } = useFetch<Data>(
    `https://api.aladhan.com/v1/timingsByCity?city=${userPreference.city}&country=${userPreference.country}&method=${userPreference.calculation_methods}`
  );
  const cache = new Cache();
  cache.set("timings", JSON.stringify(data));
  const cachedPrayerTiming = JSON.parse(cache.get("timings")!);
  return (
    <MenuBarExtra icon={Icon.Clock} title="Prayer times" tooltip="Prayer times" isLoading={isLoading}>
      <MenuBarExtra.Item title={`Fajr: ${cachedPrayerTiming?.data.timings.Fajr}`} icon={Icon.Sunrise} />
      <MenuBarExtra.Item title={`Sunrise: ${cachedPrayerTiming?.data.timings.Sunrise}`} icon={Icon.Sunrise} />
      <MenuBarExtra.Item title={`Dhuhr: ${cachedPrayerTiming?.data.timings.Dhuhr}`} icon={Icon.Sun} />
      <MenuBarExtra.Item title={`Asr: ${cachedPrayerTiming?.data.timings.Asr}`} icon={Icon.Sun} />
      <MenuBarExtra.Item title={`Maghrib: ${cachedPrayerTiming?.data.timings.Maghrib}`} icon={Icon.Moon} />
      <MenuBarExtra.Item title={`Isha: ${cachedPrayerTiming?.data.timings.Isha}`} icon={Icon.Moon} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Change city or country"
        onAction={() => {
          openCommandPreferences();
        }}
      />
    </MenuBarExtra>
  );
}
