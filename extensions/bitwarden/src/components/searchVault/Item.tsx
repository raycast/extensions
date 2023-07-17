import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import VaultItemActionPanel from "~/components/searchVault/ItemActionPanel";
import VaultItemContext from "~/components/searchVault/context/vaultItem";
import { ITEM_TYPE_TO_ICON_MAP } from "~/constants/general";
import { ITEM_TYPE_TO_LABEL } from "~/constants/labels";
import { Folder, Item, ItemType } from "~/types/vault";
import { getCardImageUrl } from "~/utils/cards";
import { captureException } from "~/utils/development";
import { extractKeywords, faviconUrl } from "~/utils/search";

const { fetchFavicons } = getPreferenceValues();

export type VaultItemProps = {
  item: Item;
  folder: Folder | undefined;
};

const VaultItem = (props: VaultItemProps) => {
  const { item, folder } = props;

  const keywords = useMemo(() => extractKeywords(item), [item]);

  return (
    <VaultItemContext.Provider value={item}>
      <List.Item
        id={item.id}
        title={item.name}
        keywords={keywords}
        accessories={getAccessories(item, folder)}
        icon={getIcon(item)}
        subtitle={item.login?.username || undefined}
        actions={<VaultItemActionPanel />}
      />
    </VaultItemContext.Provider>
  );
};

const ITEM_TYPE_TO_IMAGE_OR_ICON_MAP: Record<ItemType, (item: Item) => string | Icon> = {
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
};

function getIcon(item: Item) {
  const imageOrIcon = ITEM_TYPE_TO_IMAGE_OR_ICON_MAP[item.type]?.(item);
  if (imageOrIcon) return imageOrIcon;
  return Icon.QuestionMark;
}

type ListItemAccessory = NonNullable<List.Item.Props["accessories"]>[number];
const TYPE_TO_ACCESSORY_MAP: Record<ItemType, ListItemAccessory> = {
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
};

function getAccessories(item: Item, folder: Folder | undefined) {
  try {
    const accessories: ListItemAccessory[] = [];

    if (folder?.id) {
      accessories.push({
        icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
        tag: { value: folder.name, color: Color.SecondaryText },
        tooltip: "Folder",
      });
    }
    if (item.favorite) accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
    accessories.push(TYPE_TO_ACCESSORY_MAP[item.type]);

    return accessories;
  } catch (error) {
    captureException("Failed to get item accessories", error);
    return [];
  }
}

export default VaultItem;
