import { LaunchProps, Toast, open, showHUD, showToast } from "@raycast/api";

const SEARCH_URL = "https://ref.ly/logos4/Search";
const KIND = "BibleSearch";

/**
 * Logos Bible Search command.
 *
 * Opens a Bible search in Logos. The search mode (Smart or Precise) is
 * determined by your last-chosen setting in the Logos application.
 *
 * - Smart search: morphologically-aware, matches concepts and synonyms
 * - Precise search: exact phrase matching
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.SearchBible }>) {
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
  });

  const url = `${SEARCH_URL}?${params.toString()}`;

  try {
    await open(url);
    await showHUD("Running Bible Search in Logos");
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Logos",
      message: `Try this URL in a browser: ${url}`,
    });
  }
}
