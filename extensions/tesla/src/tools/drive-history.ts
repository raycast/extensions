import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { HistoricalDrive } from "../types/HistoricalDrive";
import { BASE_URL } from "../utils/constants";

export default async function () {
  const preferences = getPreferenceValues<{
    tessieApiKey: string;
    VIN: string;
  }>();

  const API_KEY = preferences.tessieApiKey;
  const VIN = preferences.VIN;

  const response = await fetch(`${BASE_URL}/${VIN}/drives`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  const data = ((await response.json()) as { results: HistoricalDrive[] }).results.slice(0, 50);

  return data;
}
