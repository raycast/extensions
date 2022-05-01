import fetch, { RequestInit } from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

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
