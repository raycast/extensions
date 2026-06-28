import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PrayerType, Preferences } from "../src/types/prayerTypes";

export function fetchPrayers(date?: string) {
    const userPreference: Preferences = getPreferenceValues();
    const dateStr = date ? `/${date}` : '';
    const url = `https://api.aladhan.com/v1/timingsByCity${dateStr}?city=${encodeURI(userPreference.city)}&country=${encodeURI(
        userPreference.country
    )}&method=${encodeURI(userPreference.calculation_methods)}&school=${encodeURI(
        userPreference.hanfi === true ? "1" : "0"
    )}`;

    return useFetch<PrayerType>(url, {
        keepPreviousData: true,
        onError: (error: Error) => {
                showToast({
                    style: Toast.Style.Failure,
                    title: `${error} Check your preferences`,
                    message: `Country ${userPreference.country} City ${userPreference.city}`,
                    primaryAction: {
                        title: "Change Preferences",
                        onAction: () => openExtensionPreferences(),
                    },
                });
            },
        }
    );
}
