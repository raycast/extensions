import { Tool } from "@raycast/api";
import { post, SavedArticle } from "../lib/screvi";

type Input = {
  /** The page to save. Must be an http or https URL. */
  url: string;
};

/**
 * Save a web page to the user's Screvi reading list. Screvi fetches and parses
 * the page in the background and it lands in their inbox.
 */
export default async function saveLink(input: Input) {
  const { data } = await post<{ data: SavedArticle }>("/articles", { url: input.url });

  return {
    saved: !data.duplicate,
    alreadySaved: Boolean(data.duplicate),
    parseState: data.parse_state,
    url: `https://app.screvi.com/articles/${data.id}`,
  };
}

/** Saving writes to the user's library, so Raycast asks before it happens. */
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Save this link to your Screvi reading list?",
  info: [{ name: "URL", value: input.url }],
});
