import { buildUrl } from "../utils/apiClient";
import type { PageResponse } from "../types";

type Input = {
  /**
   * The slug of the page to fetch.
   * This is the URL-friendly identifier for the page (e.g., "Albert_Einstein").
   */
  slug: string;
  /**
   * Whether to include the full page content in the response. Defaults to true.
   * Set to false if you only need metadata and stats.
   */
  includeContent?: boolean;
  /**
   * Whether to validate links in the page. Defaults to true.
   */
  validateLinks?: boolean;
};

/**
 * Fetches a specific Grokipedia page by its slug.
 * Returns page content, metadata, statistics, citations, and linked pages.
 */
const tool = async (input: Input) => {
  // Validate slug input
  if (!input.slug || typeof input.slug !== "string" || input.slug.trim() === "") {
    throw new Error("Invalid slug provided: slug must be a non-empty string");
  }

  const url = buildUrl("/page", {
    slug: input.slug.trim(),
    includeContent: input.includeContent !== false,
    validateLinks: input.validateLinks !== false,
  });

  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to fetch page (${response.status}): ${response.statusText}. ${errorBody}`);
  }

  const data = (await response.json()) as PageResponse;

  if (!data.found) {
    return {
      data: null,
      success: false,
      message: `Page with slug "${input.slug}" not found`,
    };
  }

  return {
    data: data.page,
    success: true,
  };
};

export default tool;
