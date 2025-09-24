import { createNewWindow } from "../actions";
import { runAppleScript } from "run-applescript";
import { showFailureToast } from "@raycast/utils";

type Input = {
  /** The website we should open a new window to, if one is provided. */
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
  try {
    // If a query is provided, search with Perplexity
    if (input.query) {
      const perplexityUrl = `https://perplexity.ai/search?q=${encodeURIComponent(input.query)}`;

      await runAppleScript(`
        tell application "Comet"
          make new window
          
          -- Small delay to ensure window is fully initialized before loading URL
          delay 0.2
          activate
          open location "${perplexityUrl}"
        end tell
      `);
      return `Searching "${input.query}" with Perplexity in new window`;
    }

    // If a website is provided, open it
    if (input.website) {
      const normalizedUrl = normalizeUrl(input.website);

      await runAppleScript(`
        tell application "Comet"
          make new window
          
          -- Small delay to ensure window is fully initialized before loading URL
          delay 0.2
          activate
          open location "${normalizedUrl}"
        end tell
      `);
      return `Opening new window to ${normalizedUrl}`;
    }

    // No website specified - open blank new window
    await createNewWindow();
    return `Opening new window`;
  } catch (error) {
    await showFailureToast(error);
    throw error;
  }
}
