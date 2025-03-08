import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

type Input = {
  /** The database ID to get the schema for */
  databaseId: number;
};

export default async function (input: Input) {
  const preferences = getPreferenceValues<Preferences.SearchQuestions>();

  const endpoint = new URL(`/api/database/${input.databaseId}/schema/`, preferences.instanceUrl);

  console.log(endpoint.toString());

  console.log(preferences.apiToken);

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": preferences.apiToken,
    },
  });

  console.log(response.status);
  console.log(await response.text());
  console.log(await response.json());

  return [];
}
