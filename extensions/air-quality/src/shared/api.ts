import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
import { AirQualityData, Preferences } from "./types";

const preferences: Preferences = getPreferenceValues();
const cityName = preferences.city
  ? preferences.city
      .replace(/\s/g, "")
      .replace("https://aqicn.org/city/", "")
      .replace(/^\//, "")
      .replace(/\/$/, "")
      .toLowerCase()
  : "here";

export async function fetchAirQuality() {
  const response = await axios.get(`https://api.waqi.info/feed/${cityName}/?token=${preferences.apiToken}`);
  if (response.status !== 200 || response.data.status !== "ok") {
    throw new Error(response.data?.data || "Failed to fetch air quality data");
  }
  return response.data.data as unknown as AirQualityData;
}
