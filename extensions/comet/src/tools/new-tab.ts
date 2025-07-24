import { createNewTab, createNewTabToWebsite } from "../actions";

type Input = {
  /** The website we should open a new tab to, if one is provided. */
  website?: string;
  /** The search query to search for, if one is provided. */
  query?: string;
};

export default async function (input: Input) {
  // If a query is provided, search with Perplexity
  if (input.query) {
    const perplexityUrl = `https://perplexity.ai/search?q=${encodeURIComponent(input.query)}`;
    await createNewTabToWebsite(perplexityUrl);
    return `Searching "${input.query}" with Perplexity`;
  }

  // If a website is provided, open it directly
  if (input.website) {
    await createNewTabToWebsite(input.website);
    return `Opening new tab to ${input.website}`;
  }

  // Otherwise, open empty tab
  await createNewTab();
  return "Opening new tab";
}
