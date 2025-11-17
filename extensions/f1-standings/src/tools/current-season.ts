import fetch from "node-fetch";
import { SeasonResponse } from "../types";
import { BASE_API_URL } from "../constants";
import { showFailureToast } from "@raycast/utils";

/**
 * Get the year of the current F1 season
 */
export default async function currentSeason() {
  try {
    const res = await fetch(`${BASE_API_URL}/f1/current/seasons.json`, {
      method: "get",
    });
    if (res.status !== 200) {
      throw new Error("Invalid HTPTS status code");
    }
    const data = (await res.json()) as SeasonResponse;
    const returnValue = data.MRData.SeasonTable.Seasons[0] ?? null;
    return returnValue;
  } catch (error) {
    showFailureToast("Failed to fetch current season data");
    return null;
  }
}
