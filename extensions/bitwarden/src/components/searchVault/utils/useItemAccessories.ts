import { Color, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { ITEM_TYPE_TO_ICON_MAP } from "~/constants/general";
import { ITEM_TYPE_TO_LABEL } from "~/constants/labels";
import { useFavoritesContext } from "~/context/favorites";
import { Folder, Item, ItemType, Reprompt } from "~/types/vault";
import { captureException } from "~/utils/development";

type ListItemAccessory = NonNullable<List.Item.Props["accessories"]>[number];
export const ITEM_TYPE_TO_ACCESSORY_MAP: Record<ItemType, ListItemAccessory> = {
  [ItemType.LOGIN]: {
    icon: { source: ITEM_TYPE_TO_ICON_MAP[ItemType.LOGIN], tintColor: Color.Blue },
    tooltip: ITEM_TYPE_TO_LABEL[ItemType.LOGIN],
  },
  [ItemType.CARD]: {
    icon: { source: ITEM_TYPE_TO_ICON_MAP[ItemType.CARD], tintColor: Color.Green },
    tooltip: ITEM_TYPE_TO_LABEL[ItemType.CARD],
  },
  [ItemType.IDENTITY]: {
    icon: { source: ITEM_TYPE_TO_ICON_MAP[ItemType.IDENTITY], tintColor: Color.Orange },
    tooltip: ITEM_TYPE_TO_LABEL[ItemType.IDENTITY],
  },
  [ItemType.NOTE]: {
    icon: { source: ITEM_TYPE_TO_ICON_MAP[ItemType.NOTE], tintColor: Color.PrimaryText },
    tooltip: ITEM_TYPE_TO_LABEL[ItemType.NOTE],
  },
  [ItemType.SSH_KEY]: {
    icon: { source: ITEM_TYPE_TO_ICON_MAP[ItemType.SSH_KEY], tintColor: Color.SecondaryText },
    tooltip: ITEM_TYPE_TO_LABEL[ItemType.SSH_KEY],
  },
};

export function useItemAccessories(item: Item, folder: Folder | undefined) {
  const { favoriteOrder } = useFavoritesContext();

  return useMemo(() => {
    try {
      const accessories: ListItemAccessory[] = [];

      if (folder?.id) {
        accessories.push({
          icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
          tag: { value: folder.name, color: Color.SecondaryText },
          tooltip: `${folder.name} Folder`,
        });
      }

      if (item.favorite) {
        accessories.push({ icon: { source: Icon.Star, tintColor: Color.Blue }, tooltip: "Bitwarden Favorite" });
      } else if (favoriteOrder.includes(item.id)) {
        accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
      }

      if (item.reprompt === Reprompt.REQUIRED) {
        accessories.push({
          icon: { source: Icon.Lock, tintColor: Color.SecondaryText },
          tooltip: "Master password re-prompt",
        });
      }

      if (!ITEM_TYPE_TO_ACCESSORY_MAP[item.type]) {
        throw new Error(`No accessory defined for item ${item.name} with type ${item.type}`);
      }
      accessories.push(ITEM_TYPE_TO_ACCESSORY_MAP[item.type]);

      return accessories;
    } catch (error) {
      captureException("Failed to get item accessories", error);
      return [];
    }
  }, [favoriteOrder, item.favorite, item.reprompt, item.type, folder?.id, folder?.name]);
}
