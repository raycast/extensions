import fetch from "node-fetch";
import { QualifyingResultResponse } from "../types";
import { BASE_API_URL } from "../constants";

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
 * Get qualifying results for a specific race
 */
export default async function qualifyingResults(input: Input) {
  try {
    const res = await fetch(`${BASE_API_URL}/f1/${input.year}/${input.round}/qualifying.json`, {
      method: "get",
    });
    const data = (await res.json()) as QualifyingResultResponse;
    const returnValue = data.MRData.RaceTable.Races[0]?.QualifyingResults ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
