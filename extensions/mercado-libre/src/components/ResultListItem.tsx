import { Action, ActionPanel, List } from "@raycast/api";
import { MercadoLibreItem } from "../types";
import { formatPrice, secureThumbnailURL } from "../utils";
import ItemDetail from "./ItemDetail";

interface ResultListItemProps {
  item: MercadoLibreItem;
  handleSearchOpen: () => void;
}

export function ResultListItem({ item, handleSearchOpen }: ResultListItemProps) {
  return (
    <List.Item
      key={item.id}
      title={{ value: item.title, tooltip: item.title }}
      accessories={[{ text: formatPrice(item.price, item.currency_id) }]}
      icon={{ value: secureThumbnailURL(item.thumbnail), tooltip: item.title }}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<ItemDetail item={item} handleSearchOpen={handleSearchOpen} />} />
          <Action.OpenInBrowser url={item.permalink} onOpen={handleSearchOpen} />
        </ActionPanel>
      }
    />
  );
}
