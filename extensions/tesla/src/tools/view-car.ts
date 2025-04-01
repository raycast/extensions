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

  const response = await fetch(`${BASE_URL}/${VIN}/state`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  const data = await response.json();

  return data;
}
