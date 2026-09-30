import { getPreferenceValues } from "@raycast/api";
import { fetchJinaMarkdown } from "../services/jina-service";
import { processMarkdownContent } from "../utils/markdown-utils";
import { addFrontMatter } from "../utils/get-prefs";
import { Preferences } from "../types";

type Input = {
  /**
   * The URL of the webpage to convert.
   *
   * **IMPORTANT:** Always include an argument with the `url` field.
   *
   * It must be a fully qualified URL starting with "http://" or "https://".
   *
   * Example:
   * ```json
   * { "url": "https://www.example.com/article" }
   * ```
   */
  url: string;
};

export default async function webpageToMarkdownTool(input: Input): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();

  if (!input?.url) {
    throw new Error(
      "Please provide a `url` field in your JSON tool call, for example:\n" +
        '@webpage-to-markdown convert webpage { "url": "https://example.com" }',
    );
  }

  const { url } = input;

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error(`Invalid URL: "${url}"\nIt must start with http:// or https://`);
  }

  // Fetch the webpage content from Jina.ai
  const response = await fetchJinaMarkdown(url, preferences);

  // Convert raw HTML text into Markdown with additional metadata
  const { markdown, metadata } = processMarkdownContent(
    response.data.content,
    response.data.title,
    response.data.links,
    preferences.includeLinksSummary,
  );

  // Optionally add YAML front matter if set in preferences
  const finalMarkdown = preferences.prependFrontMatter
    ? addFrontMatter(markdown, {
        title: response.data.title,
        sourceUrl: url,
        wordCount: metadata.wordCount || 0,
        readingTime: metadata.readingTime || "",
      })
    : markdown;

  return finalMarkdown;
}
