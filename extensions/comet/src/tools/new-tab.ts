import { createNewTab, createNewTabToWebsite } from "../actions";

type Input = {
  /** The website we should open a new tab to, if one is provided. */
  website?: string;
  /** The search query to search for, if one is provided. */
  query?: string;
};

function normalizeUrl(url: string): string {
  // If URL already has protocol, return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Add https:// protocol by default
  return `https://${url}`;
}

export default async function (input: Input) {
  // If a query is provided, search with Perplexity
  if (input.query) {
    const perplexityUrl = `https://perplexity.ai/search?q=${encodeURIComponent(input.query)}`;
    await createNewTabToWebsite(perplexityUrl);
    return `Searching "${input.query}" with Perplexity`;
  }

  // If a website is provided, open it directly
  if (input.website) {
    const normalizedUrl = normalizeUrl(input.website);
    await createNewTabToWebsite(normalizedUrl);
    return `Opening new tab to ${normalizedUrl}`;
  }

  // Otherwise, open empty tab
  await createNewTab();
  return "Opening new tab";
}
