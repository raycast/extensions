import fetch from "node-fetch";
import { QualifyingResultResponse } from "../types";

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
 * Get driver standings for a specific season
 */
export default async function qualifyingResults(input: Input) {
  try {
    const res = await fetch(`https://api.jolpi.ca/ergast/f1/${input.year}/${input.round}/qualifying.json`, {
      method: "get",
    });
    const data = (await res.json()) as QualifyingResultResponse;
    const returnValue = data.MRData.RaceTable.Races[0]?.QualifyingResults ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
