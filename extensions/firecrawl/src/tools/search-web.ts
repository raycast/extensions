import firecrawl from "../firecrawl";

export type Input = {
  /** The search query string to research */
  query: string;
};

export default async function (input: Input) {
  const { query } = input;

  const research = await firecrawl.search(query);

  if (!research.success) {
    throw new Error(research.error ?? "Failed to search the web");
  }

  return {
    searchResults: research.data.map((result) => ({
      url: result.url,
      title: result.title,
      description: result.description,
    })),
  };
}
