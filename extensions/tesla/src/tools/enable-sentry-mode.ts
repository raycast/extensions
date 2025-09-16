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
      `${BASE_URL}/${VIN}/command/${"enable_sentry"}?retry_duration=40&wait_for_completion=true`,
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
      return "Sentry Mode Enabled";
    } else {
      return "Failed to enable Sentry Mode";
    }
  } catch (err) {
    return "Failed to enable Sentry Mode";
  }
}
