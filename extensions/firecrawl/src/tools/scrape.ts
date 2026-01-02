import firecrawl from "../firecrawl";

export type Input = {
  /** The URL to scrape */
  url: string;
};

export default async function (input: Input) {
  const { url } = input;

  const scrapeResult = await firecrawl.scrape(url, {
    integration: "raycast",
  });

  if (!scrapeResult.markdown) {
    throw new Error("Failed to scrape webpage");
  }

  return {
    url: url,
    title: scrapeResult.metadata?.title,
    content: scrapeResult.markdown,
  };
}
