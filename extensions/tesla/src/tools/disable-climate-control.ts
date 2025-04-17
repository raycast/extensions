import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { BASE_URL } from "../utils/constants";

export default async function () {
  const preferences = getPreferenceValues<{
    tessieApiKey: string;
    VIN: string;
  }>();

  const API_KEY = preferences.tessieApiKey;
  const VIN = preferences.VIN;

  try {
    const response = await fetch(
      `${BASE_URL}/${VIN}/command/${"stop_climate"}?retry_duration=40&wait_for_completion=true`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    const result = (await response.json()) as {
      result: boolean;
      woke: boolean;
    };

    if (result.result) {
      return "Climate Control Disabled";
    } else {
      return "Failed to disable Climate Control";
    }
  } catch (err) {
    return "Failed to disable Climate Control";
  }
}
