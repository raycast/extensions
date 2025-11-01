import { baseUrl } from "../constants";
import { IncidentsState } from "../interface";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

export default async function () {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`${baseUrl}/incidents`, {
    headers: { Authorization: `Bearer ${preferences.apiKey}` },
  });
  const incidents = (await response.json()) as IncidentsState;

  return incidents;
}
