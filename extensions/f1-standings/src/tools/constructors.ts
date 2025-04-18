import fetch from "node-fetch";
import { ConstructorsResponse } from "../types";
import { BASE_API_URL } from "../constants";
import { showFailureToast } from "@raycast/utils";

type Input = {
  /**
   * Year of the season
   */
  year: number;
};

/**
 * Get constructor attendings for a specific season
 */
export default async function constructors(input: Input) {
  try {
    const res = await fetch(`${BASE_API_URL}/f1/${input.year}/constructors.json`, {
      method: "get",
    });
    if (res.status !== 200) {
      throw new Error("Invalid HTPTS status code");
    }
    const data = (await res.json()) as ConstructorsResponse;
    const returnValue = data.MRData.ConstructorTable.Constructors ?? [];
    return returnValue;
  } catch (error) {
    showFailureToast("Failed to fetch constructor data");
    return null;
  }
}
