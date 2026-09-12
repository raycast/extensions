export const DJANGO_DOCS_BASE_URL = "https://docs.djangoproject.com";
export const SITEMAP_URL = "https://docs.djangoproject.com/sitemap-en.xml";

export const DJANGO_VERSIONS = ["dev", "6.0", "5.2", "5.1", "5.0", "4.2"] as const;
export type DjangoVersion = (typeof DJANGO_VERSIONS)[number];

/**
 * Generates URL patterns for filtering Django documentation URLs by version.
 *
 * @param version - The Django version (e.g., "6.0", "dev", "5.1")
 * @returns Object containing regex patterns for topics and ref sections
 */
export function getUrlPatternsForVersion(version: DjangoVersion) {
  const escapedVersion = version.replace(".", "\\.");
  return {
    topics: new RegExp(`^https://docs\\.djangoproject\\.com/en/${escapedVersion}/topics/[^/]+/?$`),
    topicsSub: new RegExp(`^https://docs\\.djangoproject\\.com/en/${escapedVersion}/topics/[^/]+/[^/]+/?$`),
    ref: new RegExp(`^https://docs\\.djangoproject\\.com/en/${escapedVersion}/ref/[^/]+/[^/]+/?$`),
    refSub: new RegExp(`^https://docs\\.djangoproject\\.com/en/${escapedVersion}/ref/[^/]+/[^/]+/[^/]+/?$`),
  };
}
