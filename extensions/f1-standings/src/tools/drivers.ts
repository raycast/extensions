import fetch from "node-fetch";
import { DriversResponse } from "../types";
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
 * Get driver attendings for a specific season
 */
export default async function drivers(input: Input) {
  try {
    let year = input.year;
    if (year === undefined) {
      const cs = await currentSeason();
      if (cs === null) {
        throw new Error("Could not fetch current season");
      }
      year = cs.season;
    }
    const res = await fetch(`${BASE_API_URL}/f1/${year}/drivers.json`, {
      method: "get",
    });
    if (res.status !== 200) {
      throw new Error("Invalid HTPTS status code");
    }
    const data = (await res.json()) as DriversResponse;
    const returnValue = data.MRData.DriverTable.Drivers ?? [];
    return returnValue;
  } catch (error) {
    showFailureToast("Failed to fetch driver data");
    return null;
  }
}
