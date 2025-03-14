import fetch from "node-fetch";
import { ScheduleResponse } from "../types";

type Input = {
  /**
   * Year of the season
   */
  year: number;
};

/**
 * Get race schedule for a specific season
 */
export default async function raceSchedule(input: Input) {
  try {
    const res = await fetch(`https://api.jolpi.ca/ergast/f1/${input.year}/races.json`, {
      method: "get",
    });
    const data = (await res.json()) as ScheduleResponse;
    const returnValue = data.MRData.RaceTable.Races ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
