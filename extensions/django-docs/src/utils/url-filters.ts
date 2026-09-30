import { getUrlPatternsForVersion, DjangoVersion } from "../constants";

/**
 * Filters a list of URLs to only include those matching our documentation patterns
 * for a specific Django version.
 *
 * The Django sitemap contains thousands of URLs across all versions and sections.
 * We only want specific sections (topics, ref) at specific depths to keep the
 * extension focused and performant. The patterns are generated based on the version.
 *
 * @param urls - Array of URLs from the Django sitemap
 * @param version - The Django version to filter for
 * @returns URLs that match any of our defined documentation patterns for the given version
 */
export function filterTopicsUrls(urls: string[], version: DjangoVersion): string[] {
  const patterns = getUrlPatternsForVersion(version);
  return urls.filter((url) => Object.values(patterns).some((pattern) => pattern.test(url)));
}

/**
 * Filters URLs to only include those matching a specific documentation section
 * for a specific Django version.
 *
 * @param urls - Array of URLs to filter
 * @param version - The Django version to filter for
 * @param section - The section key from URL_PATTERNS (e.g., "topics", "ref")
 * @returns URLs matching the specified section pattern
 */
export function filterUrlsBySection(
  urls: string[],
  version: DjangoVersion,
  section: "topics" | "topicsSub" | "ref" | "refSub",
): string[] {
  const patterns = getUrlPatternsForVersion(version);
  return urls.filter((url) => patterns[section].test(url));
}

/**
 * Gets the section parent URL for a documentation page.
 *
 * All pages under a section (ref or topics) share the same top-level parent.
 * For example, all pages under `/ref/class-based-views/` have that URL as their parent:
 * - `/ref/class-based-views/base/` → parent: `/ref/class-based-views/`
 * - `/ref/class-based-views/mixins/` → parent: `/ref/class-based-views/`
 *
 * Top-level pages (like `/ref/class-based-views/` itself) have no parent.
 *
 * @param url - The URL to find the section parent for
 * @returns The section parent URL, or null if already at top level
 *
 * @example
 * getSectionParentUrl("https://docs.djangoproject.com/en/dev/ref/class-based-views/base/")
 * // Returns: "https://docs.djangoproject.com/en/dev/ref/class-based-views/"
 *
 * getSectionParentUrl("https://docs.djangoproject.com/en/dev/ref/class-based-views/")
 * // Returns: null (already at top level)
 */
export function getSectionParentUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  // segments: ["en", "dev", "ref", "class-based-views", "base"]

  // Find index of "ref" or "topics"
  const sectionIndex = segments.findIndex((s) => s === "ref" || s === "topics");
  if (sectionIndex === -1) return null;

  // Top-level = exactly one segment after ref/topics
  // e.g., ["en", "dev", "ref", "class-based-views"] → sectionIndex=2, length=4
  const segmentsAfterSection = segments.length - sectionIndex - 1;

  if (segmentsAfterSection <= 1) {
    return null; // Already at top level
  }

  // Parent = url truncated to ref/<first-segment>/
  const parentSegments = segments.slice(0, sectionIndex + 2);
  parsed.pathname = "/" + parentSegments.join("/") + "/";
  return parsed.href;
}
