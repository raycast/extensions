import { Action, ActionPanel, Grid } from "@raycast/api";
import { MercadoLibreItem } from "../types";
import { formatPrice } from "../utils";

interface ResultGridItemProps {
  item: MercadoLibreItem;
  handleSearchOpen: () => void;
}

export const ResultGridItem = ({ item, handleSearchOpen }: ResultGridItemProps) => (
  <Grid.Item
    key={item.id}
    content={{ value: item.thumbnail.replace(/^http:/, "https:"), tooltip: item.title }}
    title={item.title}
    subtitle={formatPrice(item.price, item.currency_id)}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser title="Open in Browser" url={`${item.permalink}`} onOpen={handleSearchOpen} />
      </ActionPanel>
    }
  />
);
