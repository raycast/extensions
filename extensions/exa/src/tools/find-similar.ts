import exa from "../exa";

type Input = {
  /**
   * The URL of the webpage to find similar results for.
   */
  url: string;
  /**
   * Number of search results to return.
   * @default 10
   */
  numResults?: number;
  /**
   * Results will only include links with a published date after this date.
   * Must be specified in ISO 8601 format.
   */
  startPublishedDate?: string;
  /**
   * Results will only include links with a published date before this date.
   * Must be specified in ISO 8601 format.
   */
  endPublishedDate?: string;
  /**
   * A data category to focus on when searching, with higher comprehensivity and data cleanliness.
   */
  category?:
    | "company"
    | "research paper"
    | "news"
    | "pdf"
    | "github"
    | "tweet"
    | "personal site"
    | "linkedin profile"
    | "financial report";
};

/**
 * @returns The results of the search, including the title, url, and highlights of the content of the similar results.
 */
export default async function (input: Input) {
  const { url } = input;

  const { results } = await exa.findSimilarAndContents(url, {
    ...input,
    text: true,
    summary: true,
    useAutoprompt: true,
  });

  return results.map((result) => ({
    title: result.title,
    url: result.url,
    summary: result.summary,
  }));
}
