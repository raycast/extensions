import { extractArticleMarkdown, extractFallbackMarkdown } from "./extract";
import { buildFrontmatter, combineFrontmatterAndBody } from "./frontmatter";
import type { CommandPreferences } from "./types";

export type ConvertPreferences = CommandPreferences;

export type ConversionResult = {
  markdown: string;
  title: string | undefined;
  url: string;
};

export async function convertWebpageToMarkdown(options: {
  url: string;
  preferences: ConvertPreferences;
  onProgress?: (message: string) => void;
}): Promise<ConversionResult> {
  const { url, preferences, onProgress } = options;

  onProgress?.("Extracting main content…");
  let extracted = await extractArticleMarkdown(url);

  if (!extracted || extracted.bodyMarkdown.trim().length < 200) {
    if (
      preferences.externalFallbackEnabled &&
      preferences.externalFallbackPrefix?.trim()
    ) {
      onProgress?.("Local extraction failed; using external fallback…");
      extracted = await extractFallbackMarkdown(
        url,
        preferences.externalFallbackPrefix.trim(),
      );
    }
  }

  if (!extracted || extracted.bodyMarkdown.trim().length < 50) {
    throw new Error(
      "Could not extract meaningful article content from the page.",
    );
  }

  const frontmatter = buildFrontmatter(
    extracted,
    preferences.includeFrontmatter ?? false,
  );
  const markdown = combineFrontmatterAndBody(
    frontmatter,
    extracted.bodyMarkdown,
  );

  return { markdown, title: extracted.title, url };
}
