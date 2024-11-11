import { Detail, ActionPanel, Color, Action } from "@raycast/api";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { Product } from "./types";
import { formatNumber, removeProtocol } from "./utils";

export function ProductDetails(props: { product: Product }) {
  const item = props.product;
  const markdown = `
# ${item.name}

${item.thumbnail_url ? `![Illustration](${item.thumbnail_url})` : ""}

${NodeHtmlMarkdown.translate(item.description)}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={item.name}
      metadata={<ProductMetadata product={item} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.short_url} />
        </ActionPanel>
      }
    />
  );
}

export function ProductMetadata(props: { product: Product }) {
  const item = props.product;

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title={"Price"}>
        <Detail.Metadata.TagList.Item text={item.formatted_price} color={Color.Green} />
      </Detail.Metadata.TagList>
      {item.url && <Detail.Metadata.Link title={"Product URL"} text={removeProtocol(item.url)} target={item.url} />}
      {item.tags.length > 0 && (
        <Detail.Metadata.TagList title={"Tags"}>
          {item.tags.map((tag) => (
            <Detail.Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </Detail.Metadata.TagList>
      )}
      <Detail.Metadata.Label title={"ID"} text={item.id} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title={"Number of Sales"} text={`${formatNumber(item.sales_count)}`} />
      <Detail.Metadata.Label title={"Status"} text={item.published ? "🟢 Published" : "⚪ Not Published"} />
      {item.variants.length > 0 && <Detail.Metadata.Separator />}
      {item.variants.map((variant, variantIndex) => {
        const title = variant.title || "Variant";
        return variant.options.map((option, optionIndex) => (
          <Detail.Metadata.Label key={`${variantIndex}-${optionIndex}`} title={title} text={option.name} />
        ));
      })}
    </Detail.Metadata>
  );
}
