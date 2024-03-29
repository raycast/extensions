import { Action, ActionPanel, List } from "@raycast/api";
import { MercadoLibreItem } from "../types";
import { formatPrice } from "../utils";

interface ResultListItemProps {
  item: MercadoLibreItem;
  handleSearchOpen: () => void;
}

export const ResultListItem = ({ item, handleSearchOpen }: ResultListItemProps) => (
  <List.Item
    key={item.id}
    title={{ value: item.title, tooltip: item.title }}
    accessories={[{ text: formatPrice(item.price, item.currency_id) }]}
    icon={item.thumbnail.replace(/^http:/, "https:")}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser title="Open in Browser" url={`${item.permalink}`} onOpen={handleSearchOpen} />
      </ActionPanel>
    }
  />
);
