import { callGeekflare, normalizeUrl, toScrapedText } from "../geekflare";

type Input = {
  /**
   * Full URL of the public page to scrape, or a domain such as example.com.
   */
  url: string;
};

/**
 * @returns The page content as Markdown, truncated to 20000 characters.
 */
export default async function (input: Input) {
  const url = normalizeUrl(input.url);
  const text = toScrapedText(await callGeekflare("webscraping", { url, format: ["markdown-llm"] }));
  return { url, markdown: text.slice(0, 20_000), truncated: text.length > 20_000 };
}
