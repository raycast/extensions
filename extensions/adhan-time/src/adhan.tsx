import { MenuBarExtra, getPreferenceValues, Icon, openCommandPreferences, showToast, Toast } from "@raycast/api";
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
    `https://api.aladhan.com/v1/timingsByCity?city=${encodeURI(userPreference.city)}&country=${encodeURI(
      userPreference.country
    )}&method=${encodeURI(userPreference.calculation_methods)}`,
    {
      keepPreviousData: true,
      onError: (error: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: `${error} Check your preferences`,
          message: `Country ${userPreference.country} City ${userPreference.city}`,
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openCommandPreferences(),
          },
        });
      },
    }
  );
  return (
    <MenuBarExtra icon={Icon.Clock} title="Prayer times" tooltip="Prayer times" isLoading={isLoading}>
      <MenuBarExtra.Item title={`Fajr: ${data?.data.timings.Fajr}`} icon={Icon.Sunrise} />
      <MenuBarExtra.Item title={`Sunrise: ${data?.data.timings.Sunrise}`} icon={Icon.Sunrise} />
      <MenuBarExtra.Item title={`Dhuhr: ${data?.data.timings.Dhuhr}`} icon={Icon.Sun} />
      <MenuBarExtra.Item title={`Asr: ${data?.data.timings.Asr}`} icon={Icon.Sun} />
      <MenuBarExtra.Item title={`Maghrib: ${data?.data.timings.Maghrib}`} icon={Icon.Moon} />
      <MenuBarExtra.Item title={`Isha: ${data?.data.timings.Isha}`} icon={Icon.Moon} />

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Change city or country"
          onAction={() => {
            openCommandPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
