import fetch from "node-fetch";
import { DriverStandingResponse } from "../types";

type Input = {
  /**
   * Year of the season
   */
  year: number;
};

/**
 * Get driver standings for a specific season
 */
export default async function driverStandings(input: Input) {
  try {
    const res = await fetch(`https://api.jolpi.ca/ergast/f1/${input.year}/driverStandings.json`, {
      method: "get",
    });
    const data = (await res.json()) as DriverStandingResponse;
    const returnValue = data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
