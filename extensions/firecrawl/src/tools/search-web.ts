import firecrawl from "../firecrawl";

export type Input = {
  /** The search query string to research */
  query: string;
};

export default async function (input: Input) {
  const { query } = input;

  const research = await firecrawl.search(query, {
    integration: "raycast",
  });

  if (!research.web) {
    throw new Error("Failed to search the web");
  }

  return {
    searchResults: research.web,
  };
}
