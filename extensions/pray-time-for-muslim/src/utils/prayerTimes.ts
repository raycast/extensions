import { Toast, showToast } from "@raycast/api";
import axios from "axios";

interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
}

interface ApiResponse {
  data: {
    timings: PrayerTimings;
  };
}

interface LocationResponse {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

function formatTime(time: string): string {
  // Convert 24-hour format to 12-hour format with AM/PM
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

async function getLocation(): Promise<LocationResponse> {
  try {
    const response = await axios.get("https://ipapi.co/json/");
    return {
      latitude: response.data.latitude,
      longitude: response.data.longitude,
      city: response.data.city,
      country: response.data.country_name,
    };
  } catch (error) {
    console.error("Error getting location:", error);
    throw new Error("Failed to get location");
  }
}

export async function getPrayerTime(prayerName: keyof PrayerTimings) {
  try {
    // Show loading toast
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Getting Prayer Times",
      message: "Fetching your location...",
    });

    const { latitude, longitude, city, country } = await getLocation();

    // Update toast while fetching prayer times
    toast.message = "Calculating prayer times...";

    // Format current date
    const now = new Date();
    const date = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    const formattedDate = `${date}-${month}-${year}`;

    const response = await axios.get<ApiResponse>(`https://api.aladhan.com/v1/timings/${formattedDate}`, {
      params: {
        latitude,
        longitude,
        method: 2, // Islamic Society of North America (ISNA)
      },
    });

    const time = response.data.data.timings[prayerName];
    const formattedTime = formatTime(time);

    // Create a prayer-specific emoji mapping
    const emojiMap: Record<keyof PrayerTimings, string> = {
      Fajr: "🌅",
      Sunrise: "☀️",
      Dhuhr: "🌞",
      Asr: "🌤",
      Sunset: "🌅",
      Maghrib: "🌆",
      Isha: "🌙",
      Imsak: "🌌",
      Midnight: "🕛",
      Firstthird: "⏰",
      Lastthird: "⏰",
    };

    const emoji = emojiMap[prayerName] || "🕌";

    // Show success toast with the prayer time
    await showToast({
      style: Toast.Style.Success,
      title: `${emoji} ${prayerName} Prayer Time`,
      message: `${formattedTime} in ${city}, ${country}`,
      primaryAction: {
        title: "Refresh",
        shortcut: { modifiers: ["cmd"], key: "r" },
        onAction: () => getPrayerTime(prayerName),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to get location") {
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Location Error",
        message: "Could not determine your location. Please check your internet connection.",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Error",
        message: "Failed to fetch prayer time. Please try again.",
      });
    }
    console.error(error);
  }
}
