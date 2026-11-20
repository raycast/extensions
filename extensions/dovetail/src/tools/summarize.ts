import { getPreferenceValues } from "@raycast/api";
import { BaseUrl, buildHeaders, SummarizeResponse } from "../api/endpoints";

type Input = {
  /**
   * Ids of highlights to include in the summary, as returned by `search-workspace` (type HIGHLIGHT).
   */
  highlightIds?: string[];
  /**
   * Ids of data entries to include in the summary, as returned by `search-workspace` (type NOTE).
   */
  dataIds?: string[];
  /**
   * Ids of docs to include in the summary, as returned by `search-workspace` (type INSIGHT).
   */
  docIds?: string[];
  /**
   * Ids of tags to include in the summary, as returned by `search-workspace` (type TAG).
   */
  tagIds?: string[];
};

/**
 * Generate an AI-powered summary from a mix of highlights, data entries, docs, and tags in
 * the user's Dovetail workspace. At least one id must be provided. Find ids first with the
 * `search-workspace` tool. Use this instead of fetching and summarizing content yourself
 * when the user asks for Dovetail's own "Magic Summarize" output.
 */
export default async function tool(input: Input) {
  const { dovetailApiToken } = getPreferenceValues<Preferences>();

  if (!input.highlightIds?.length && !input.dataIds?.length && !input.docIds?.length && !input.tagIds?.length) {
    throw new Error("Provide at least one highlight, data, doc, or tag id to summarize.");
  }

  const response = await fetch(BaseUrl + "/v1/summarize", {
    method: "POST",
    headers: buildHeaders(dovetailApiToken),
    body: JSON.stringify({
      highlight_ids: input.highlightIds ?? [],
      note_ids: input.dataIds ?? [],
      insight_ids: input.docIds ?? [],
      tag_ids: input.tagIds ?? [],
      with_citations: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Dovetail summarize failed: ${response.status} ${response.statusText}`);
  }

  const parsed = SummarizeResponse.parse(await response.json());
  return parsed.data;
}
