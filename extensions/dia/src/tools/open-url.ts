import { open } from "@raycast/api";
import { DIA_BUNDLE_ID, toDiaURL } from "../open-url";

type Input = {
  /**
   * The URL to open, or a search query.
   *
   * @remarks
   * Text that doesn't look like a URL is searched with the search engine configured in the extension preferences.
   */
  url: string;
};

/**
 * Opens a URL in a new Dia tab, or searches the web when given a search query.
 */
export default async function tool(input: Input) {
  const url = toDiaURL(input.url.trim());
  try {
    await open(url, DIA_BUNDLE_ID);
  } catch {
    throw new Error(`Couldn't open ${url} in Dia. Make sure Dia is installed.`);
  }
  return { openedURL: url };
}
