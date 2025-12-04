import { baseUrl } from "../constants";
import { HeartbeatsState } from "../interface";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

export default async function () {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`${baseUrl}/heartbeats`, {
    headers: { Authorization: `Bearer ${preferences.apiKey}` },
  });
  const heartbeats = (await response.json()) as HeartbeatsState;

  return heartbeats;
}
