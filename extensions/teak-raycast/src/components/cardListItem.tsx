import { Color, Icon, type List } from "@raycast/api";
import type { RaycastCard } from "../lib/api";
import { getCardDomain } from "../lib/cardDetailModel";
import { doneStatusLabel, isDone } from "../lib/doneStates";

export const getCardSubtitle = (card: RaycastCard): string => {
  const domain = getCardDomain(card);
  if (card.type === "link") {
    return domain || card.metadataDescription || card.notes || card.url || "";
  }

  return (
    card.notes ||
    card.fileName ||
    card.metadataDescription ||
    card.url ||
    domain ||
    ""
  );
};

export const getCardAccessories = (
  card: RaycastCard,
): List.Item.Accessory[] => {
  const accessories: List.Item.Accessory[] = [];

  if (card.tags[0]) {
    accessories.push({
      tag: {
        color: Color.Blue,
        value: card.tags[0],
      },
      tooltip: "First tag",
    });
  }

  if (isDone(card)) {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: doneStatusLabel(card),
    });
  }

  if (card.isArchived) {
    accessories.push({ icon: Icon.Box, tooltip: "Archived" });
  }

  if (card.isFavorited) {
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Favorited",
    });
  }

  accessories.push({
    date: new Date(card.createdAt),
    tooltip: "Created at",
  });

  return accessories;
};
