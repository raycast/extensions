import { MenuBarExtra, getPreferenceValues, Icon, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { PrayerType, Prayers, Preferences } from "./prayer-types";

export default function Command() {
  const userPreference: Preferences = getPreferenceValues();
  const { isLoading, data: prayerTimes } = useFetch<PrayerType>(
    `https://api.aladhan.com/v1/timingsByCity?city=${encodeURI(userPreference.city)}&country=${encodeURI(
      userPreference.country
    )}&method=${encodeURI(userPreference.calculation_methods)}&school=${encodeURI(
      userPreference.hanfi === true ? "1" : "0"
    )}`,
    {
      keepPreviousData: true,
      onError: (error: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: `${error} Check your preferences`,
          message: `Country ${userPreference.country} City ${userPreference.city}`,
          primaryAction: {
            title: "Change  Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
      },
    }
  );

  const prayers: Prayers | undefined = prayerTimes?.data.timings;
  return (
    <MenuBarExtra icon={Icon.Clock} title="Prayer times" tooltip="Prayer times" isLoading={isLoading}>
      {prayers &&
        Object.entries(prayers).map(([key, value]) => <MenuBarExtra.Item key={key} title={`${key}: ${value}`} />)}
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
