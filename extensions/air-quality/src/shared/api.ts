import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
import { AirQualityData, Preferences } from "./types";
import { cleanCityName, extractErrorMessage } from "./utils";

const preferences: Preferences = getPreferenceValues();
const cityName = cleanCityName(preferences.city);

export async function fetchAirQuality() {
  const response = await axios.get(`https://api.waqi.info/feed/${cityName}/?token=${preferences.apiToken}`);
  if (response.status !== 200 || response.data.status !== "ok" || response.data.data?.status === "error") {
    throw new Error(extractErrorMessage(response));
  }
  return response.data.data as unknown as AirQualityData;
}
