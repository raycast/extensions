import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import VaultItemActionPanel from "~/components/searchVault/ItemActionPanel";
import VaultItemContext from "~/components/searchVault/context/vaultItem";
import { Folder, Item } from "~/types/vault";
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

function getAccessories(item: Item, folder: Folder | undefined) {
  const accessories = [];

  if (folder?.id) {
    accessories.push({
      icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
      tooltip: "Folder",
      text: folder.name,
    });
  }

  if (item.favorite) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
  }

  return accessories;
}

export default VaultItem;
