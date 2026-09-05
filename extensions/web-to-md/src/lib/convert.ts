import type { ExtractedArticle } from "./extract";
import { extractArticleMarkdown, extractArticleMarkdownFromHtml, extractFallbackMarkdown } from "./extract";
import { buildFrontmatter, combineFrontmatterAndBody } from "./frontmatter";
import type { CommandPreferences } from "./types";

export type ConvertPreferences = CommandPreferences;

export type ConversionResult = {
  /** The full document, frontmatter included — what gets saved or copied. */
  markdown: string;
  /**
   * The article body on its own. Raycast's Detail renderer has no notion of
   * YAML frontmatter and would print the block as literal text, so previews
   * render this instead.
   */
  body: string;
  title: string | undefined;
  url: string;
};

function contentLength(extracted: ExtractedArticle | null): number {
  return extracted ? extracted.bodyMarkdown.trim().length : 0;
}

export async function convertWebpageToMarkdown(options: {
  url: string;
  preferences: ConvertPreferences;
  /**
   * Already-rendered HTML for the page, as the browser extension supplies for
   * the active tab. Skips the network entirely, so pages behind a login or
   * rendered client-side convert correctly.
   */
  html?: string;
  onProgress?: (message: string) => void;
}): Promise<ConversionResult> {
  const { url, html, preferences, onProgress } = options;

  onProgress?.("Extracting main content…");

  // A blocked or paywalled page fails as a thrown fetch error, which is the
  // main reason local extraction fails at all — so hold the error rather than
  // propagating it, and give the fallback a chance to rescue the page.
  let extracted: ExtractedArticle | null = null;
  let primaryError: unknown;
  try {
    extracted = html ? extractArticleMarkdownFromHtml(html, url) : await extractArticleMarkdown(url);
  } catch (err) {
    primaryError = err;
  }

  const fallbackPrefix = preferences.externalFallbackEnabled ? preferences.externalFallbackPrefix?.trim() : undefined;

  if (contentLength(extracted) < 200 && fallbackPrefix) {
    onProgress?.(
      extracted
        ? "Local extraction looked thin; using external fallback…"
        : "Local extraction failed; using external fallback…",
    );

    let fallback: ExtractedArticle | null = null;
    try {
      fallback = await extractFallbackMarkdown(url, fallbackPrefix);
    } catch (err) {
      // The reader service is third-party: a 429/502 or an unreachable host
      // must never discard content we already extracted locally.
      console.error("[web-to-md] external fallback failed:", err);
    }

    // Only take the fallback if it actually beat what we already had.
    if (fallback && contentLength(fallback) > contentLength(extracted)) {
      // The reader service returns body text only, so carry over whatever
      // metadata local extraction managed to find.
      extracted = {
        ...(extracted ?? {}),
        ...fallback,
        title: fallback.title ?? extracted?.title,
        author: fallback.author ?? extracted?.author,
        excerpt: fallback.excerpt ?? extracted?.excerpt,
      };
    }
  }

  if (contentLength(extracted) < 50 || !extracted) {
    // Prefer the real cause over a generic message when the page never loaded.
    if (primaryError) throw primaryError;
    throw new Error("Could not extract meaningful article content from the page.");
  }

  const frontmatter = buildFrontmatter(extracted, preferences.includeFrontmatter ?? false);
  const body = extracted.bodyMarkdown.trim() + "\n";
  const markdown = combineFrontmatterAndBody(frontmatter, body);

  return { markdown, body, title: extracted.title, url };
}
