import { Action, ActionPanel, List } from "@raycast/api";
import { useMemo } from "react";
import { withProviders } from "../../hocs/with-providers";
import { useStore } from "../../providers/store-provider/store-provider";
import { toPriceString } from "../../utils/to-price-string";
import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";

export interface ProductDetailsProps {
  product: ManagementSchemas["ProductDto"];
}

const Line = ({
  name,
  value,
  hidden = false,
  productId,
}: {
  name: string;
  value: string;
  hidden?: boolean;
  productId: string;
}) => {
  const { store } = useStore();

  if (hidden) return null;
  return (
    <List.Item
      title={name}
      accessories={[{ text: value }]}
      keywords={[value, name + value, value + name]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Value" content={value} />
          <Action.OpenInBrowser
            title="Open"
            url={`https://dashboard.paynow.gg/products/${productId}?s=${store?.slug}`}
          />
        </ActionPanel>
      }
    />
  );
};

const ProductDetails = ({ product }: ProductDetailsProps) => {
  const status = useMemo(() => {
    if (product.is_hidden) return "Hidden";
    const now = new Date();
    if (product.enabled_at && new Date(product.enabled_at) > now) return "Scheduled";
    if (product.enabled_until && new Date(product.enabled_until) < now) return "Expired";
    return "Active";
  }, [product.enabled_at, product.enabled_until, product.is_hidden]);

  return (
    <List navigationTitle={product.name}>
      <Line productId={product.id} name="ID" value={product.id} />
      <Line productId={product.id} name="Name" value={product.name} />
      <Line productId={product.id} name="Slug" value={product.slug} />
      <Line productId={product.id} name="Status" value={status} />
      <Line
        productId={product.id}
        name="Tags"
        value={product.tags.map((tag) => tag.name).join(", ") || "None"}
        hidden={product.tags.length === 0}
      />
      <Line productId={product.id} name="Price" value={toPriceString(product)} />
      <Line
        productId={product.id}
        name="Type"
        value="Hybrid"
        hidden={!product.allow_one_time_purchase || !product.allow_subscription}
      />
      <Line productId={product.id} name="Type" value="One-time" hidden={!product.allow_one_time_purchase} />
      <Line productId={product.id} name="Type" value="Subscription" hidden={!product.allow_subscription} />
      <Line
        productId={product.id}
        name="Created At"
        value={new Date(product.created_at || 0).toLocaleString()}
        hidden={!product.created_at}
      />
      <Line
        productId={product.id}
        name="Updated At"
        value={new Date(product.updated_at || 0).toLocaleString()}
        hidden={!product.updated_at}
      />
      {product.image_url && (
        <List.Item
          title="Image"
          accessories={[{ icon: product.image_url || undefined }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Image URL" content={product.image_url || ""} />
              <Action.OpenInBrowser title="Open Image" url={product.image_url} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

export default withProviders(ProductDetails);
