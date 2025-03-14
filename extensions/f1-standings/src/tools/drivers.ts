import fetch from "node-fetch";
import { DriversResponse } from "../types";

type Input = {
  /**
   * Year of the season
   */
  year: number;
};

/**
 * Get driver attendings for a specific season
 */
export default async function drivers(input: Input) {
  try {
    const res = await fetch(`https://api.jolpi.ca/ergast/f1/${input.year}/drivers.json`, {
      method: "get",
    });
    const data = (await res.json()) as DriversResponse;
    const returnValue = data.MRData.DriverTable.Drivers ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
