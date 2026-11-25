import { openSearchInput } from "../browser-actions";

interface Input {
  /** An HTTP(S) URL to open directly, or search terms to submit to Search Browser's configured search engine. */
  query: string;
}

/** Open a URL or search terms in a new Search Browser tab. This has a visible browser side effect. */
export default async function openInSearch(input: Input) {
  const value = typeof input.query === "string" ? input.query.trim() : "";
  if (!value) throw new Error("Provide a URL or search terms.");

  await openSearchInput(value);
  return "Opened the requested destination in a new Search Browser tab.";
}
