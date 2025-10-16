import { Icon, getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";
import { ITEM_TYPE_TO_ICON_MAP } from "~/constants/general";
import { Item, ItemType } from "~/types/vault";
import { getCardImageUrl } from "~/utils/cards";
import { faviconUrl } from "~/utils/search";

const { fetchFavicons } = getPreferenceValues();

export const ITEM_TYPE_TO_IMAGE_OR_ICON_MAP: Record<ItemType, (item: Item) => string | Icon> = {
  [ItemType.LOGIN]: (item: Item) => {
    const iconUri = item.login?.uris?.[0]?.uri;
    if (fetchFavicons && iconUri) return faviconUrl(iconUri);
    return ITEM_TYPE_TO_ICON_MAP[ItemType.LOGIN];
  },
  [ItemType.CARD]: (item: Item) => {
    const { brand } = item.card ?? {};
    if (brand) {
      const cardBrandImage = getCardImageUrl(brand);
      if (cardBrandImage) return cardBrandImage;
    }
    return ITEM_TYPE_TO_ICON_MAP[ItemType.CARD];
  },
  [ItemType.IDENTITY]: () => ITEM_TYPE_TO_ICON_MAP[ItemType.IDENTITY],
  [ItemType.NOTE]: () => ITEM_TYPE_TO_ICON_MAP[ItemType.NOTE],
  [ItemType.SSH_KEY]: () => ITEM_TYPE_TO_ICON_MAP[ItemType.SSH_KEY],
};

export function useItemIcon(item: Item) {
  return useMemo(() => {
    const imageOrIcon = ITEM_TYPE_TO_IMAGE_OR_ICON_MAP[item.type]?.(item);
    if (imageOrIcon) return imageOrIcon;
    return Icon.QuestionMark;
  }, [item.type, item.card?.brand, item.login?.uris?.[0]?.uri]);
}
