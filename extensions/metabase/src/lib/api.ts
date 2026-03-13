import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences.SearchQuestions>();

export interface Database {
  id: number;
  name: string;
  engine: string;
  tables: {
    name: string;
    schema: string;
    // and other fields
  }[];
}

export interface Card {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
  view_count: number;
  display: "bar" | "table" | "scalar" | "line" | "pie" | (string & Record<string, never>);
  dataset_query: {
    database: number;
    native: {
      query: string;
      template_tags: Record<string, { display_name: string; id: string; name: string; type: string }>;
    };
    type: "native";
  };
  creator: {
    email: string;
    first_name: string;
    last_login: string;
    is_qbnewb: boolean;
    is_superuser: boolean;
    id: number;
    last_name: string;
    date_joined: string;
    common_name: string;
  };
}

export interface Query {
  rows: string[][];
}

export async function runQuery(input: { query: string; databaseId: number }) {
  const endpoint = new URL(`/api/dataset`, preferences.instanceUrl);

  return fetch(endpoint.toString(), {
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
  })
    .then((res) => res.json() as Promise<{ data: Query }>)
    .then((res) => res.data);
}

export async function getQuestion(input: { questionId: number }) {
  const endpoint = new URL(`/api/card/${input.questionId}`, preferences.instanceUrl);

  return fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": preferences.apiToken,
    },
  }).then((res) => res.json() as Promise<Card>);
}

export async function runQuestion(input: { questionId: number }) {
  const endpoint = new URL(`/api/card/${input.questionId}/query`, preferences.instanceUrl);

  return fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      accept: "application/json",
      contentType: "application/json",
      "x-api-key": preferences.apiToken,
    },
    body: JSON.stringify({}),
  }).then((res) => res.json() as Promise<{ data: Query }>);
}

export async function getDatabases() {
  const endpoint = new URL("/api/database", preferences.instanceUrl);

  endpoint.searchParams.set("include", "tables");

  return fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": preferences.apiToken,
    },
  })
    .then((res) => res.json() as Promise<{ data: Database[] }>)
    .then((res) => res.data);
}

export async function getDatabase(databaseId: number) {
  const endpoint = new URL(`/api/database/${databaseId}`, preferences.instanceUrl);

  return fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": preferences.apiToken,
    },
  }).then((res) => res.json() as Promise<Database>);
}

export async function getQuestions() {
  const endpoint = new URL("/api/card", preferences.instanceUrl);

  return fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": preferences.apiToken,
    },
  }).then((res) => res.json() as Promise<Card[]>);
}
