import { Action, ActionPanel, List } from "@raycast/api";
import { MercadoLibreItem } from "../types";
import { formatPrice, secureThumbnailURL } from "../utils";

interface ResultListItemProps {
  item: MercadoLibreItem;
  handleSearchOpen: () => void;
}

export const ResultListItem = ({ item, handleSearchOpen }: ResultListItemProps) => (
  <List.Item
    key={item.id}
    title={{ value: item.title, tooltip: item.title }}
    accessories={[{ text: formatPrice(item.price, item.currency_id) }]}
    icon={secureThumbnailURL(item.thumbnail)}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser url={`${item.permalink}`} onOpen={handleSearchOpen} />
      </ActionPanel>
    }
  />
);
