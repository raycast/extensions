import { updateCommandMetadata } from "@raycast/api";
import { fetchPrayerTimes } from "./api";
import { getPreferences } from "./preferences";
import { formatTime } from "./time";

export async function updateIftarMetadata() {
  const prefs = getPreferences();
  const { city, country, method, school, timeFormat } = prefs;

  try {
    const data = await fetchPrayerTimes(city, country, method, school);
    const iftarTime = data.timings.Maghrib;
    const formatted = formatTime(iftarTime, timeFormat);
    await updateCommandMetadata({ subtitle: formatted });
  } catch (error) {
    console.error("Failed to update Iftar metadata:", error);
  }
}

export async function updateSehriMetadata() {
  const prefs = getPreferences();
  const { city, country, method, school, timeFormat, sehriSource } = prefs;

  try {
    const data = await fetchPrayerTimes(city, country, method, school);
    const rawSehri =
      sehriSource === "imsak" ? data.timings.Imsak : data.timings.Fajr;
    const formatted = formatTime(rawSehri, timeFormat);
    await updateCommandMetadata({ subtitle: formatted });
  } catch (error) {
    console.error("Failed to update Sehri metadata:", error);
  }
}

export async function updateRamadanMetadata() {
  const prefs = getPreferences();
  const { city, country, method, school, timeFormat, sehriSource } = prefs;

  try {
    const data = await fetchPrayerTimes(city, country, method, school);
    const rawSehri =
      sehriSource === "imsak" ? data.timings.Imsak : data.timings.Fajr;
    const rawIftar = data.timings.Maghrib;

    const sehriFormatted = formatTime(rawSehri, timeFormat);
    const iftarFormatted = formatTime(rawIftar, timeFormat);

    // Calculator format inspired: Sehri: 5:12 AM | Iftar: 6:34 PM
    await updateCommandMetadata({
      subtitle: `Sehri: ${sehriFormatted} | Iftar: ${iftarFormatted}`,
    });
  } catch (error) {
    console.error("Failed to update Ramadan metadata:", error);
  }
}
