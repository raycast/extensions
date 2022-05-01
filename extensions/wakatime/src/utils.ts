import fetch, { RequestInit } from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

const URL = "https://wakatime.com/api/v1";

export async function getUser(id = "current") {
  const response = await fetch(`${URL}/users/${id}`, setHeaders());
  return (await response.json()) as WakaTime.User;
}

function setHeaders(headers: RequestInit = {}) {
  const { apiKey } = getPreferenceValues<Preferences>();

  return {
    ...headers,
    headers: {
      ...headers.headers,
      Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}`,
    },
  };
}

interface Preferences {
  apiKey: string;
}
