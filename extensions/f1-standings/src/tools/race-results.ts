import fetch from "node-fetch";
import { ResultResponse } from "../types";

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
export default async function raceResults(input: Input) {
  try {
    const res = await fetch(`https://api.jolpi.ca/ergast/f1/${input.year}/${input.round}/results.json`, {
      method: "get",
    });
    const data = (await res.json()) as ResultResponse;
    const returnValue = data.MRData.RaceTable.Races[0]?.Results ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
