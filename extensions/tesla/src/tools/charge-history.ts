import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { HistoricalCharge } from "../types/HistoricalCharge";
import { BASE_URL } from "../utils/constants";

export default async function () {
  const preferences = getPreferenceValues<{
    tessieApiKey: string;
    VIN: string;
  }>();

  const API_KEY = preferences.tessieApiKey;
  const VIN = preferences.VIN;

  const response = await fetch(
    `${BASE_URL}/${VIN}/charges?distance_format=mi&format=json&superchargers_only=false&exclude_origin=true&timezone=UTC`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    }
  );

  const data = ((await response.json()) as { results: HistoricalCharge[] }).results.slice(0, 100);

  return data;
}
