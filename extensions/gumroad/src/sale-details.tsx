import { Detail, Color, ActionPanel, Action } from "@raycast/api";
import { Sale } from "./types";
import { formatDate, removeParentheses } from "./utils";

export function SaleDetails(props: { sale: Sale }) {
  const item = props.sale;
  const markdown = `
# Sale of ${item.product_name} for ${item.formatted_total_price}

You made a sale!

![Illustration](gumroad-coins.png?raycast-width=320)

## ${item.formatted_total_price}

${item.product_name}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={item.product_name}
      metadata={<SaleMetadata sale={item} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Customer Email" content={item.email} />
        </ActionPanel>
      }
    />
  );
}

function SaleMetadata(props: { sale: Sale }) {
  const item = props.sale;

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title={"Price"}>
        <Detail.Metadata.TagList.Item text={item.formatted_total_price} color={Color.Green} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title={"Order Number"} text={String(item.order_id)} />
      <Detail.Metadata.Label title={"Date"} text={formatDate(item.created_at)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title={"Email"} text={item.email} />
      <Detail.Metadata.Label title={"Quantity"} text={String(item.quantity)} />
      <Detail.Metadata.Label title={"Referrer"} text={item.referrer} />
      {item.variants_and_quantity && (
        <Detail.Metadata.Label title={"Variant"} text={removeParentheses(item.variants_and_quantity)} />
      )}
    </Detail.Metadata>
  );
}
