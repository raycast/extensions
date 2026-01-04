import { LaunchProps, Toast, getPreferenceValues, open, showHUD, showToast } from "@raycast/api";

const SEARCH_URL = "https://ref.ly/logos4/Search";
const KIND = "BibleSearch";

interface Preferences {
  useSmartSearch: boolean;
}

type CommandArguments = {
  query?: string;
};

/**
 * Logos Bible Search command.
 *
 * Opens a Bible search in Logos.
 *
 * - Smart search: morphologically-aware, matches concepts and synonyms
 * - Precise search: exact phrase matching
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

  // Build the URL with appropriate parameters
  // syntax=v2 enables Logos' intelligent search capabilities
  const params = new URLSearchParams({
    kind: KIND,
    q: query,
    syntax: "v2",
    engine: preferences.useSmartSearch ? "Semantic" : "Lexical",
  });

  const url = `${SEARCH_URL}?${params.toString()}`;

  try {
    await open(url);
    await showHUD(`Running ${preferences.useSmartSearch ? "Smart" : "Precise"} Bible Search in Logos`);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Logos",
      message: `Try this URL in a browser: ${url}`,
    });
  }
}
