import fetch from "node-fetch";
import { DriversResponse } from "../types";
import { BASE_API_URL } from "../constants";

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
    const res = await fetch(`${BASE_API_URL}/f1/${input.year}/drivers.json`, {
      method: "get",
    });
    const data = (await res.json()) as DriversResponse;
    const returnValue = data.MRData.DriverTable.Drivers ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
