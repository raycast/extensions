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
  const url = buildUrl("/page", {
    slug: input.slug,
    includeContent: input.includeContent !== false,
    validateLinks: input.validateLinks !== false,
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.statusText}`);
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
