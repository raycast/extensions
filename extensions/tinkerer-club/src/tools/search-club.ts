import { getApiClient } from "../api/preferences";
import { unwrapPayload } from "../lib/json";
import { SearchAllInput } from "../types/api";

type Input = {
  /** Search terms for people, posts, topics, projects, and other club content. Maximum 100 characters. */
  query: string;
};

export default async function searchClub(input: Input) {
  const query = input.query.trim();
  if (!query) throw new Error("A non-empty search query is required.");
  if (query.length > 100) throw new Error("The search query must not exceed 100 characters.");

  const client = getApiClient();
  const result = await client.call<SearchAllInput>({ path: "search.all", type: "query" }, { query });
  return unwrapPayload(result);
}
