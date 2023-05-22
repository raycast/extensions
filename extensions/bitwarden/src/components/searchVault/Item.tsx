import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import VaultItemActionPanel from "~/components/searchVault/ItemActionPanel";
import VaultItemContext from "~/components/searchVault/context/vaultItem";
import { Folder, Item, ItemType } from "~/types/vault";
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

const ITEM_TYPE_TO_ICON_MAP = {
  1: Icon.Globe,
  2: Icon.BlankDocument,
  3: Icon.List,
  4: Icon.Person,
};

function getIcon(item: Item) {
  const iconUri = item.login?.uris?.[0]?.uri;
  if (fetchFavicons && iconUri) return faviconUrl(iconUri);
  return ITEM_TYPE_TO_ICON_MAP[item.type];
}

type ListItemAccessory = NonNullable<List.Item.Props["accessories"]>[number];
const TYPE_TO_ACCESSORY_MAP: Record<ItemType, ListItemAccessory> = {
  [ItemType.LOGIN]: { icon: { source: Icon.Globe, tintColor: Color.Blue }, tooltip: "Login" },
  [ItemType.CARD]: { icon: { source: Icon.CreditCard, tintColor: Color.Green }, tooltip: "Card" },
  [ItemType.IDENTITY]: { icon: { source: Icon.Person, tintColor: Color.Orange }, tooltip: "Identity" },
  [ItemType.NOTE]: { icon: { source: Icon.Document, tintColor: Color.PrimaryText }, tooltip: "Secure Note" },
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
