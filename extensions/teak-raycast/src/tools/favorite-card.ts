import type { Tool } from "@raycast/api";
import { setCardFavorite } from "../lib/api";
import { parseToolCardId } from "../lib/apiParsers";

type Input = {
  /** The Teak card id to update. */
  cardId: string;
  /** Whether the card should be favorited (true) or unfavorited (false). */
  isFavorited: boolean;
};

export default async function tool(input: Input) {
  const cardId = parseToolCardId(input.cardId);

  const updated = await setCardFavorite(cardId, input.isFavorited, "silent");

  return {
    appUrl: updated.appUrl,
    cardId: updated.id,
    isFavorited: updated.isFavorited,
    title:
      updated.metadataTitle ?? (updated.content.slice(0, 80) || "Untitled"),
  };
}

export const confirmation: Tool.Confirmation<Input> = (input) =>
  Promise.resolve({
    info: [
      { name: "Card ID", value: input.cardId },
      { name: "Action", value: input.isFavorited ? "Favorite" : "Unfavorite" },
    ],
    message: input.isFavorited
      ? "Mark this Teak card as a favorite?"
      : "Remove this Teak card from favorites?",
  });
