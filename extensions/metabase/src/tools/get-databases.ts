import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

export default async function () {
  const preferences = getPreferenceValues<Preferences.SearchQuestions>();

  const endpoint = new URL("/api/database", preferences.instanceUrl);

  endpoint.searchParams.set("include", "tables");

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": preferences.apiToken,
    },
  }).then((res) => res.json() as Promise<{ data: unknown[] }>);

  return {
    databases: response.data,
  };
}
