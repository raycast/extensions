import fetch from "node-fetch";
import { ConstructorsResponse } from "../types";

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
    const res = await fetch(`https://api.jolpi.ca/ergast/f1/${input.year}/constructors.json`, {
      method: "get",
    });
    const data = (await res.json()) as ConstructorsResponse;
    const returnValue = data.MRData.ConstructorTable.Constructors ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
