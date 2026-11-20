import { Icon } from "@raycast/api";
import { useCallback, useRef, useState } from "react";
import { getCardById, searchCards } from "../lib/api";
import { getCardTitle } from "../lib/cardDetailModel";
import { CardsListCommand } from "./CardsListCommand";

interface SimilarCardsViewProps {
  cardId: string;
  /** The card's title; looked up with the first page when not known. */
  title?: string;
}

export function SimilarCardsView({ cardId, title }: SimilarCardsViewProps) {
  const [resolvedTitle, setResolvedTitle] = useState(title);
  const titleRequested = useRef(Boolean(title));

  // The list reloads when this function changes, so it must stay stable.
  const loadCards = useCallback(
    (input: Parameters<typeof searchCards>[0]) => {
      if (!titleRequested.current) {
        titleRequested.current = true;
        getCardById(cardId, "interactive")
          .then((card) => setResolvedTitle(getCardTitle(card)))
          .catch(() => undefined);
      }
      return searchCards(
        { ...input, limit: 50, similarTo: cardId },
        "interactive",
      );
    },
    [cardId],
  );

  const heading = resolvedTitle ? `Like: ${resolvedTitle}` : "Similar Cards";
  return (
    <CardsListCommand
      emptyDescription="Teak found nothing close in meaning to this card yet."
      emptyIcon={Icon.Stars}
      emptyTitle="No similar cards"
      loadCards={loadCards}
      navigationTitle={heading}
      searchBarPlaceholder="Narrow these with tag:, fav, after:…"
      sectionTitle="Closest First"
      serverOrder
    />
  );
}
