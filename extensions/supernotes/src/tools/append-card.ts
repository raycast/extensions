import { superfetch } from "~/api/superfetch";
import { getSupernotesPrefs } from "~/utils/helpers";

type Input = {
  /**
   * The ID of the card to append to, use search-cards to find the card ID. This is required.
   */
  id: string;

  /**
   * The content markup to append to the card. Required.
   */
  content: string;
};

/**
 * Appends content to a card
 * You will need to search for the card first using the search-cards tool
 * If the card is not found then let the user know
 * If the card is found then append the content to the card
 * @param input The input to the tool
 */
export default async function (input: Input) {
  const { apiKey } = getSupernotesPrefs();
  const fetched = await superfetch(`/v1/cards/simple/{card_id}/append`, "put", {
    apiKey,
    path: { card_id: input.id },
    body: input.content,
  });

  if (!fetched.ok) {
    throw new Error(`There was a problem appending to the card: ${fetched.body.detail}`);
  }

  return fetched.body;
}
