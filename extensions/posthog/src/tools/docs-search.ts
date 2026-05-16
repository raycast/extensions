import { searchDocs } from "../api/docs";

type Input = {
  /**
   * A natural-language search query — e.g. "how to set up server-side feature flags in Python".
   * Returns up to 10 PostHog documentation results with titles and URLs.
   */
  query: string;
};

export default async function (input: Input) {
  return await searchDocs(input.query);
}
