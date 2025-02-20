import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { MercadoLibreItem } from "../types";
import { formatPrice, secureThumbnailURL } from "../utils";
import ItemDetail from "./ItemDetail";
interface ResultGridItemProps {
  item: MercadoLibreItem;
  handleSearchOpen: () => void;
}

export function ResultGridItem({ item, handleSearchOpen }: ResultGridItemProps) {
  return (
    <Grid.Item
      key={item.id}
      content={{ value: secureThumbnailURL(item.thumbnail), tooltip: item.title }}
      title={item.title}
      subtitle={formatPrice(item.price, item.currency_id)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Listing Details"
            target={<ItemDetail item={item} handleSearchOpen={handleSearchOpen} />}
            icon={Icon.Eye}
          />
          <Action.OpenInBrowser title="Open Listing in Browser" url={item.permalink} onOpen={handleSearchOpen} />
        </ActionPanel>
      }
    />
  );
}
