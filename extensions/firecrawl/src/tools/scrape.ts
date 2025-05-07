import firecrawl from "../firecrawl";

export type Input = {
  /** The URL to scrape */
  url: string;
};

export default async function (input: Input) {
  const { url } = input;

  const scrapeResult = await firecrawl.scrapeUrl(url);

  if (!scrapeResult.success) {
    throw new Error(scrapeResult.error ?? "Failed to scrape webpage");
  }

  return {
    url: url,
    title: scrapeResult.title,
    content: scrapeResult.markdown,
  };
}
