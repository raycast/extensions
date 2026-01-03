import { LaunchProps, Toast, getPreferenceValues, open, showHUD, showToast } from "@raycast/api";

type Preferences = {
  defaultPreciseSearch?: boolean;
};

type CommandArguments = {
  query?: string;
};

const SEARCH_URL = "https://ref.ly/logos4/Search";
const KIND = "BibleSearch";

/**
 * Logos Bible Search command.
 *
 * Opens either a smart search (morphologically-aware, matches concepts and synonyms)
 * or a precise search (exact phrase match) depending on preferences.
 *
 * Smart search uses syntax=v2 which enables Logos' intelligent matching.
 * Precise search wraps the query in quotes for exact matching.
 */
export default async function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const query = props.arguments.query?.trim();

  if (!query) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Query required",
      message: "Type what you want to search for in the Bible.",
    });
    return;
  }

  // Determine search mode
  const isPrecise = preferences.defaultPreciseSearch ?? false;

  // Build the search query
  // For precise search, wrap in quotes for exact matching
  // For smart search, use the query as-is with v2 syntax
  const searchQuery = isPrecise ? `"${query}"` : query;

  // Build the URL with appropriate parameters
  // syntax=v2 enables Logos' smart morphological matching
  const params = new URLSearchParams({
    kind: KIND,
    q: searchQuery,
    syntax: "v2",
  });

  const url = `${SEARCH_URL}?${params.toString()}`;

  try {
    await open(url);
    const searchType = isPrecise ? "Precise" : "Smart";
    await showHUD(`Running ${searchType} Bible Search in Logos`);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Logos",
      message: `Try this URL in a browser: ${url}`,
    });
  }
}
