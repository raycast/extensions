import { Tool } from "@raycast/api";
import { articleUrl, post, SavedArticle } from "../lib/screvi";

type Input = {
  /** The page to save. Must be an http or https URL. */
  url: string;
};

/**
 * Save a web page to the user's Screvi reading list. Screvi fetches and parses
 * the page in the background and it lands in their inbox.
 */
export default async function saveLink(input: Input) {
  // The model can hand over anything; hold it to what the description promises
  // rather than letting the server reject it with a DNS error.
  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    throw new Error(`Not a valid URL: ${input.url}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Only http and https links can be saved, got ${url.protocol}`);
  }

  const { data } = await post<{ data: SavedArticle }>("/articles", { url: url.toString() });

  return {
    saved: !data.duplicate,
    alreadySaved: Boolean(data.duplicate),
    parseState: data.parse_state,
    url: articleUrl(data.id),
  };
}

/** Saving writes to the user's library, so Raycast asks before it happens. */
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Save this link to your Screvi reading list?",
  info: [{ name: "URL", value: input.url }],
});
