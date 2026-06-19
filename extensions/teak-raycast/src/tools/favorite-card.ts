import type { Tool } from "@raycast/api";
import { setCardFavorite } from "../lib/api";

type Input = {
  /** The Teak card id to update. */
  cardId: string;
  /** Whether the card should be favorited (true) or unfavorited (false). */
  isFavorited: boolean;
};

/**
 * Toggle the favorite state of a Teak card by id.
 */
export default async function tool(input: Input) {
  const cardId = input.cardId?.trim();
  if (!cardId) {
    throw new Error("cardId is required");
  }

  const updated = await setCardFavorite(cardId, input.isFavorited);

  return {
    appUrl: updated.appUrl,
    cardId: updated.id,
    isFavorited: updated.isFavorited,
    title:
      updated.metadataTitle ?? (updated.content.slice(0, 80) || "Untitled"),
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: [
      { name: "Card ID", value: input.cardId },
      { name: "Action", value: input.isFavorited ? "Favorite" : "Unfavorite" },
    ],
    message: input.isFavorited
      ? "Mark this Teak card as a favorite?"
      : "Remove this Teak card from favorites?",
  };
};
