import { Color, Icon, type List } from "@raycast/api";
import type { RaycastCard } from "../lib/api";
import { getCardDomain } from "../lib/cardDetailModel";
import { formatDateTime } from "../lib/dateFormat";
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

/** When the card was last saved; lists are ordered by this, so the date matches the order. */
export const getCardSavedAt = (
  card: Pick<RaycastCard, "createdAt" | "savedAt">,
): number => card.savedAt ?? card.createdAt;

export const getCardAccessories = (
  card: RaycastCard,
  /** Leaves out a mark every card in the list has: archived in the Archive, the star in Favorites. */
  {
    inArchive = false,
    inFavorites = false,
  }: { inArchive?: boolean; inFavorites?: boolean } = {},
): List.Item.Accessory[] => {
  const accessories: List.Item.Accessory[] = [];

  const [firstTag, ...otherTags] = card.tags;
  if (firstTag) {
    accessories.push({
      tag: { color: Color.Blue, value: firstTag },
      tooltip: `Tags: ${card.tags.join(", ")}`,
    });
  }
  if (otherTags.length > 0) {
    accessories.push({
      tag: { color: Color.SecondaryText, value: `+${otherTags.length}` },
      tooltip: `Also tagged ${otherTags.join(", ")}`,
    });
  }

  if (isDone(card)) {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: doneStatusLabel(card),
    });
  }

  if (card.isArchived && !inArchive) {
    accessories.push({ icon: Icon.Box, tooltip: "Archived" });
  }

  if (card.isFavorited && !inFavorites) {
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Favorite",
    });
  }

  const savedAt = getCardSavedAt(card);
  accessories.push({
    date: new Date(savedAt),
    tooltip: `Saved ${formatDateTime(savedAt)}`,
  });

  return accessories;
};
