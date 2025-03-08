import { Tool, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

type Input = {
  /** The SQL query to run */
  query: string;
  /** The database ID to run the query against */
  databaseId: number;
};

export default async function (input: Input) {
  const preferences = getPreferenceValues<Preferences.SearchQuestions>();

  const endpoint = new URL(`/api/dataset`, preferences.instanceUrl);

  const response = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": preferences.apiToken,
    },
    body: JSON.stringify({
      database: input.databaseId,
      type: "native",
      native: {
        query: input.query,
      },
    }),
  });

  if (!response.status.toString().startsWith("2")) {
    const error = await response.text();
    throw new Error(`Error: ${error}`);
  }

  return response.json();
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const preferences = getPreferenceValues<Preferences.SearchQuestions>();

  const endpoint = new URL(`/api/database/${input.databaseId}`, preferences.instanceUrl);

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": preferences.apiToken,
    },
  });

  const database = (await response.json()) as { name: string };

  return {
    title: "Run Tool",
    message: "Are you sure you want to run this query?",
    info: [
      {
        name: "Database",
        value: database.name,
      },
      {
        name: "Query",
        value: input.query,
      },
    ],
  };
};
