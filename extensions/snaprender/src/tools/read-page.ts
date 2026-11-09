import { getClient } from "../lib/raycast";

type Input = {
  /** The public web page to read, for example https://example.com/blog/post */
  url: string;
};

const MAX_LENGTH = 40_000;

/**
 * Reads the main content of a public web page and returns it as Markdown.
 */
export default async function tool(input: Input) {
  const result = await getClient().extractMarkdown(input.url, MAX_LENGTH);
  return {
    url: result.url,
    wordCount: result.wordCount,
    truncated: result.content.length >= MAX_LENGTH,
    markdown: result.content,
  };
}
