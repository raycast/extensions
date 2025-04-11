import fetch from "node-fetch";
import { DriverStandingResponse } from "../types";
import { BASE_API_URL } from "../constants";

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
    const res = await fetch(`${BASE_API_URL}/f1/${input.year}/driverStandings.json`, {
      method: "get",
    });
    const data = (await res.json()) as DriverStandingResponse;
    const returnValue = data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
