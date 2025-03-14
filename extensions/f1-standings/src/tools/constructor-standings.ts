import fetch from "node-fetch";
import { ConstructorStandingResponse } from "../types";

type Input = {
  /**
   * Year of the season
   */
  year: number;
};

/**
 * Get constructor standings for a specific season
 */
export default async function constructorStandings(input: Input) {
  try {
    const res = await fetch(`https://api.jolpi.ca/ergast/f1/${input.year}/constructorstandings.json`, {
      method: "get",
    });
    const data = (await res.json()) as ConstructorStandingResponse;
    const returnValue = data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
    return returnValue;
  } catch (error) {
    return null;
  }
}
