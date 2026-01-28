import fetch from "node-fetch";
import { ScheduleResponse } from "../types";
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
 * Get race schedule for a specific season
 */
export default async function raceSchedule(input: Input) {
  try {
    let year = input.year;
    if (year === undefined) {
      const cs = await currentSeason();
      if (cs === null) {
        throw new Error("Could not fetch current season");
      }
      year = cs.season;
    }
    const res = await fetch(`${BASE_API_URL}/f1/${year}/races.json`, {
      method: "get",
    });
    if (res.status !== 200) {
      throw new Error("Invalid HTPTS status code");
    }
    const data = (await res.json()) as ScheduleResponse;
    const returnValue = data.MRData.RaceTable.Races ?? [];
    return returnValue;
  } catch (error) {
    showFailureToast("Failed to fetch race schedule data");
    return null;
  }
}
