import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { PrayerType, Preferences } from "../src/prayer-types";
export function fetchPrayers() {
    const userPreference: Preferences = getPreferenceValues();
    return useFetch<PrayerType>(
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
}