import { getPreferenceValues } from "@raycast/api";
import { BaseUrl, buildHeaders, ExportDataResponse, ExportDocResponse } from "../api/endpoints";
import { cleanMarkdown } from "../utils/formatting";

type Input = {
  /**
   * The id of the doc or data entry to fetch, as returned by the `search-workspace` tool.
   */
  id: string;
  /**
   * Which kind of resource `id` refers to. Use "doc" for INSIGHT search results (Dovetail's
   * "Docs") and "data" for NOTE search results (Dovetail's "Data").
   */
  kind: "doc" | "data";
};

/**
 * Fetch the full markdown content of a Dovetail doc or data entry by id, so it can be read
 * or summarized. Find ids first with the `search-workspace` tool.
 */
export default async function tool(input: Input) {
  const { dovetailApiToken } = getPreferenceValues<Preferences>();
  const path = input.kind === "doc" ? "docs" : "data";

  const response = await fetch(`${BaseUrl}/v1/${path}/${input.id}/export/markdown`, {
    headers: buildHeaders(dovetailApiToken),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Dovetail ${input.kind} ${input.id}: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const schema = input.kind === "doc" ? ExportDocResponse : ExportDataResponse;
  const data = schema.parse(json.data);

  return {
    id: data.id,
    title: data.title,
    createdAt: data.created_at,
    content: cleanMarkdown(data.content_markdown || ""),
  };
}
