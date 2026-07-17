import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  includeMetadata: boolean;
  prependFrontMatter: boolean;
  includeLinksSummary: boolean;
  jinaApiKey?: string;
}

interface ArticleMetadata {
  title?: string;
  sourceUrl: string;
  wordCount: number;
  readingTime: string;
}

export function addFrontMatter(markdown: string, metadata: ArticleMetadata) {
  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.prependFrontMatter) {
    return markdown;
  }

  const frontMatter = [
    "---",
    `title: "${metadata.title || "article"}"`,
    `source_url: "${metadata.sourceUrl}"`,
    `word_count: ${metadata.wordCount}`,
    `reading_time: "${metadata.readingTime}"`,
    `date_converted: "${new Date().toISOString()}"`,
    "---",
    markdown,
  ].join("\n");

  return frontMatter;
}
