import { Action, ActionPanel, Grid } from "@raycast/api";
import { MercadoLibreItem } from "../types";
import { formatPrice, secureThumbnailURL } from "../utils";

interface ResultGridItemProps {
  item: MercadoLibreItem;
  handleSearchOpen: () => void;
}

export const ResultGridItem = ({ item, handleSearchOpen }: ResultGridItemProps) => (
  <Grid.Item
    key={item.id}
    content={{ value: secureThumbnailURL(item.thumbnail), tooltip: item.title }}
    title={item.title}
    subtitle={formatPrice(item.price, item.currency_id)}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser url={`${item.permalink}`} onOpen={handleSearchOpen} />
      </ActionPanel>
    }
  />
);
