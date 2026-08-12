import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

const BUFFER_API = "https://api.buffer.com";

interface Preferences {
  apiToken: string;
}

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

// ── Generic GraphQL caller ──────────────────────────────────────────────────

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: { message: string }[];
}

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const { apiToken } = getPrefs();
  const res = await fetch(BUFFER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Buffer API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("\n"));
  }
  if (!json.data) {
    throw new Error("No data returned from Buffer API");
  }
  return json.data;
}
