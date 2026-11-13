import { getPreferenceValues } from "@raycast/api";
import { BaseUrl, buildHeaders, SearchV2Response } from "../api/endpoints";

type Input = {
  /**
   * The full-text search query to run across the workspace.
   */
  query: string;
  /**
   * Restrict the search to specific content types. Omit to search everything.
   * INSIGHT and NOTE map to Dovetail's "Docs" and "Data" resources respectively.
   */
  types?: (
    | "AGENT"
    | "CHANNEL"
    | "DASHBOARD"
    | "FOLDER"
    | "HIGHLIGHT"
    | "INSIGHT"
    | "NOTE"
    | "PERSON"
    | "PROJECT"
    | "TAG"
    | "THEME"
  )[];
  /**
   * Maximum number of results to return per content type. Defaults to 10.
   */
  limit?: number;
};

/**
 * Search across all content in the user's Dovetail workspace — docs, data, projects,
 * highlights, tags, contacts, channels, and more — using a full-text query. Returns
 * matching items grouped by type with their id, title, url, and a short preview so they
 * can be opened or referenced. Use `get-content` afterwards to fetch the full body of a
 * specific doc or data entry.
 */
export default async function tool(input: Input) {
  const { dovetailApiToken } = getPreferenceValues<Preferences>();

  const response = await fetch(BaseUrl + "/v2/search", {
    method: "POST",
    headers: buildHeaders(dovetailApiToken),
    body: JSON.stringify({
      options: { query: input.query, types: input.types },
      limit: input.limit ?? 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`Dovetail search failed: ${response.status} ${response.statusText}`);
  }

  const parsed = SearchV2Response.parse(await response.json());
  const {
    url,
    total,
    agents,
    highlights,
    tags,
    notes,
    insights,
    channels,
    dashboards,
    themes,
    projects,
    folders,
    people,
  } = parsed.data;
  const groups = { agents, highlights, tags, notes, insights, channels, dashboards, themes, projects, folders, people };

  const results = Object.entries(groups).flatMap(([type, items]) =>
    items.map((item) => ({
      type,
      id: item.id,
      title: item.title ?? item.name ?? "Untitled",
      url: item.url,
      project: item.project_title ?? undefined,
      preview: item.preview_text ?? undefined,
    })),
  );

  return { total, exploreUrl: url, results };
}
