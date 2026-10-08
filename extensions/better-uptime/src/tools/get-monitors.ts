import { baseUrl } from "../constants";
import { MonitorsState } from "../interface";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

export default async function () {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`${baseUrl}/monitors`, {
    headers: { Authorization: `Bearer ${preferences.apiKey}` },
  });
  const monitors = (await response.json()) as MonitorsState;

  return monitors;
}
