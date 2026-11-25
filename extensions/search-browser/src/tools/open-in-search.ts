import type { Tool } from "@raycast/api";
import { openSearchInput } from "../browser-actions";

interface Input {
  /** An HTTP(S) URL to open directly, or search terms to submit to Search Browser's configured search engine. */
  query: string;
}

export const confirmation: Tool.Confirmation<Input> = async ({ query }) => ({
  message: "Open this destination in a new Search Browser tab?",
  info: [{ name: "URL or Search Query", value: query }],
});

/** Open a URL or search terms in a new Search Browser tab. This has a visible browser side effect. */
export default async function openInSearch(input: Input) {
  const value = typeof input.query === "string" ? input.query.trim() : "";
  if (!value) throw new Error("Provide a URL or search terms.");

  await openSearchInput(value);
  return "Opened the requested destination in a new Search Browser tab.";
}
