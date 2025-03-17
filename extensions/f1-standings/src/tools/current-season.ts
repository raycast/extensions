import fetch from "node-fetch";
import { SeasonResponse } from "../types";
import { BASE_API_URL } from "../constants";

/**
 * Get the year of the current F! season
 */
export default async function currentSeason() {
  try {
    const res = await fetch(`${BASE_API_URL}/f1/current/seasons.json`, {
      method: "get",
    });
    const data = (await res.json()) as SeasonResponse;
    const returnValue = data.MRData.SeasonTable.Seasons[0] ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
