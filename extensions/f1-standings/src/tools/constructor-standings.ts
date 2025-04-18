import fetch from "node-fetch";
import { ConstructorStandingResponse } from "../types";
import { BASE_API_URL } from "../constants";
import { showFailureToast } from "@raycast/utils";

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
    const res = await fetch(`${BASE_API_URL}/f1/${input.year}/constructorstandings.json`, {
      method: "get",
    });
    if (res.status !== 200) {
      throw new Error("Invalid HTPTS status code");
    }
    const data = (await res.json()) as ConstructorStandingResponse;
    const returnValue = data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
    return returnValue;
  } catch (error) {
    showFailureToast("Failed to fetch constructor standings data");
    return null;
  }
}
