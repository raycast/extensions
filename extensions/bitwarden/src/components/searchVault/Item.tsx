import { ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import SearchItemActions from "~/components/searchVault/ItemActions";
import { Folder, Item } from "~/types/vault";
import { extractKeywords, faviconUrl } from "~/utils/search";

const { fetchFavicons } = getPreferenceValues();

export type SearchItemProps = {
  item: Item;
  folder: Folder | undefined;
};

const SearchItem = (props: SearchItemProps) => {
  const { item, folder } = props;

  const keywords = useMemo(() => extractKeywords(item), [item]);

  return (
    <List.Item
      id={item.id}
      title={item.name}
      keywords={keywords}
      accessories={getAccessories(item, folder)}
      icon={getIcon(item)}
      subtitle={item.login?.username || undefined}
      actions={
        <ActionPanel>
          <SearchItemActions item={item} />
        </ActionPanel>
      }
    />
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

export default SearchItem;
