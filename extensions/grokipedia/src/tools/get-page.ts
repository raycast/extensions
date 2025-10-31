import { createFailure, createSuccess, type ToolResult } from "./tool-result";
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
const tool = async (input: Input): Promise<ToolResult<PageResponse["page"]>> => {
  const slug = typeof input.slug === "string" ? input.slug.trim() : "";

  if (!slug) {
    return createFailure("Invalid slug provided: slug must be a non-empty string");
  }

  const url = buildUrl("/page", {
    slug,
    includeContent: input.includeContent !== false,
    validateLinks: input.validateLinks !== false,
  });

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      return createFailure(`Failed to fetch page (${response.status}): ${response.statusText}. ${errorBody}`);
    }

    const data = (await response.json()) as PageResponse;

    if (!data.found || !data.page) {
      return createFailure(`Page with slug "${slug}" not found`);
    }

    return createSuccess(data.page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return createFailure(`Failed to fetch page: ${message}`);
  }
};

export default tool;
