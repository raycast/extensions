import fetch, { RequestInit } from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

const URL = "https://wakatime.com/api/v1";

export async function getUser(id = "current") {
  const response = await fetch(`${URL}/users/${id}`, setHeaders());
  return (await response.json()) as WakaTime.User;
}

function setHeaders(headers: RequestInit = {}) {
  const API_KEY_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  const { apiKey } = getPreferenceValues<Preferences>();

  if (!API_KEY_REGEX.test(apiKey)) throw new Error("Invalid API Key");

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
