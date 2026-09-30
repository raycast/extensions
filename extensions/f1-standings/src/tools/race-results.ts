import fetch from "node-fetch";
import { ResultResponse } from "../types";
import { BASE_API_URL } from "../constants";
import { showFailureToast } from "@raycast/utils";

type Input = {
  /**
   * Year of the season
   */
  year: number;
  /**
   * Round of the race within the season (use race schedule to get the round)
   */
  round: number;
};

/**
 * Get driver standings for a specific race
 */
export default async function raceResults(input: Input) {
  try {
    const res = await fetch(`${BASE_API_URL}/f1/${input.year}/${input.round}/results.json`, {
      method: "get",
    });
    if (res.status !== 200) {
      throw new Error("Invalid HTPTS status code");
    }
    const data = (await res.json()) as ResultResponse;
    const returnValue = data.MRData.RaceTable.Races[0]?.Results ?? [];
    return returnValue;
  } catch (error) {
    showFailureToast("Failed to fetch race result data");
    return null;
  }
}
