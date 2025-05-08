import fetch from "node-fetch";
import { DriverStandingResponse } from "../types";
import { BASE_API_URL } from "../constants";
import { showFailureToast } from "@raycast/utils";
import currentSeason from "./current-season";

type Input = {
  /**
   * Year of the season
   */
  year?: number;
};

/**
 * Get driver standings for a specific season
 */
export default async function driverStandings(input: Input) {
  try {
    let year = input.year;
    if (year === undefined) {
      const cs = await currentSeason();
      if (cs === null) {
        throw new Error("Could not fetch current season");
      }
      year = cs.season;
    }
    const res = await fetch(`${BASE_API_URL}/f1/${year}/driverStandings.json`, {
      method: "get",
    });
    if (res.status !== 200) {
      throw new Error("Invalid HTPTS status code");
    }
    const data = (await res.json()) as DriverStandingResponse;
    const returnValue = data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
    return returnValue;
  } catch (error) {
    showFailureToast("Failed to fetch driver standings data");
    return null;
  }
}
