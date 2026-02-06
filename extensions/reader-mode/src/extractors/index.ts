import { BaseExtractor, ExtractorResult, ExtractorDocument } from "./_base";
import { HackerNewsExtractor } from "./hackernews";
import { GitHubExtractor } from "./github";
import { RedditExtractor } from "./reddit";
import { MediumExtractor } from "./medium";
export { BaseExtractor };
export type { ExtractorResult };

/**
 * Registry of site-specific extractors.
 * Each entry maps a URL pattern to an extractor class.
 */
const EXTRACTOR_REGISTRY: Array<{
  pattern: RegExp;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ExtractorClass: new (doc: ExtractorDocument, url: string, schemaOrgData?: any) => BaseExtractor;
}> = [
  {
    pattern: /^news\.ycombinator\.com$/i,
    name: "HackerNews",
    ExtractorClass: HackerNewsExtractor,
  },
  {
    pattern: /^(.*\.)?github\.com$/i,
    name: "GitHub",
    ExtractorClass: GitHubExtractor,
  },
  {
    pattern: /^(.*\.)?reddit\.com$/i,
    name: "Reddit",
    ExtractorClass: RedditExtractor,
  },
  {
    pattern: /^(.*\.)?medium\.com$/i,
    name: "Medium",
    ExtractorClass: MediumExtractor,
  },
];

/**
 * Get an extractor instance for a given URL, if one exists.
 *
 * @param document - The parsed DOM document
 * @param url - The page URL
 * @param schemaOrgData - Optional Schema.org data already extracted
 * @returns An extractor instance if one matches and can extract, null otherwise
 */
export function getExtractor(
  document: ExtractorDocument,
  url: string,
  schemaOrgData?: Record<string, unknown> | null,
): BaseExtractor | null {
  let hostname: string;

  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }

  for (const { pattern, ExtractorClass } of EXTRACTOR_REGISTRY) {
    if (pattern.test(hostname)) {
      const extractor = new ExtractorClass(document, url, schemaOrgData);
      if (extractor.canExtract()) {
        return extractor;
      }
    }
  }

  return null;
}

/**
 * Check if a URL has a registered extractor (without instantiating it)
 */
export function hasExtractor(url: string): boolean {
  let hostname: string;

  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }

  return EXTRACTOR_REGISTRY.some(({ pattern }) => pattern.test(hostname));
}

/**
 * Get the name of the extractor for a URL, if one exists
 */
export function getExtractorName(url: string): string | null {
  let hostname: string;

  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }

  for (const { pattern, name } of EXTRACTOR_REGISTRY) {
    if (pattern.test(hostname)) {
      return name;
    }
  }

  return null;
}
