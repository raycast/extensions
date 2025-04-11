import { Action, ActionPanel, Detail } from "@raycast/api";
import { MercadoLibreItem } from "../types";
import { formatPercentage, formatPrice, secureThumbnailURL } from "../utils";

interface ItemDetailProps {
  item: MercadoLibreItem;
  handleSearchOpen: () => void;
}

export default function ItemDetail({ item, handleSearchOpen }: ItemDetailProps) {
  const markdown = `![${item.title}](${secureThumbnailURL(item.thumbnail)}?raycast-width=350&raycast-height=350)`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={item.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Price" text={`${formatPrice(item.price, item.currency_id)}`} />
          {item.installments && (
            <>
              <Detail.Metadata.Label
                title="Installments"
                text={`${item.installments.quantity}x ${formatPrice(item.installments.amount, item.installments.currency_id)}`}
              />
              <Detail.Metadata.Label title="Interest Rate" text={`${formatPercentage(item.installments.rate)}`} />
            </>
          )}
          <Detail.Metadata.Label title="Condition" text={item.condition} />
          <Detail.Metadata.Label title="Available Quantity" text={String(item.available_quantity)} />
          <Detail.Metadata.Label title="Free Shipping" text={item.shipping.free_shipping ? "Yes" : "No"} />
          <Detail.Metadata.Separator />
          {item.attributes.map((attr) =>
            attr.value_name ? <Detail.Metadata.Label key={attr.id} title={attr.name} text={attr.value_name} /> : null,
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Listing in Browser" url={item.permalink} onOpen={handleSearchOpen} />
        </ActionPanel>
      }
    />
  );
}
