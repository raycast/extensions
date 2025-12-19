import { ActionPanel, Action, List, Color, Icon } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useRecommendations, useStoreMeta } from "./services/hooks";
import ProductDetail from "./product-detail";
import { formatPrice } from "./services/product-mapper";

type Props = {
  productId: number;
  productHandle: string;
  baseUrl?: string | null;
};

export default function Recommendations({ productId, productHandle, baseUrl }: Props) {
  const { value: storeRoute } = useLocalStorage<string | null>("storeRoute", null);

  const effectiveStoreRoute = baseUrl ?? storeRoute;

  const storeMetaResp = useStoreMeta(effectiveStoreRoute ?? "");
  const storeMeta = storeMetaResp.data ?? null;
  const storeCurrency = storeMeta?.currency ?? undefined;

  const { data, isLoading } = useRecommendations(effectiveStoreRoute ?? "", productId, true);

  const recommendations = data?.products ?? [];

  return (
    <List isLoading={isLoading} navigationTitle={`Recommendations for ${productHandle}`}>
      {recommendations.length === 0 && !isLoading && (
        <List.EmptyView title="No Recommendations" description="No product recommendations found." />
      )}
      {recommendations.map((product) => {
        const price = formatPrice(product.price, storeCurrency, true); // price is in cents
        const availability = product.available ? "Available" : "Unavailable";
        const subtitle = [price, availability].filter(Boolean).join(" • ");

        return (
          <List.Item
            key={product.id}
            title={product.title}
            subtitle={subtitle}
            icon={{ source: product.featured_image || Icon.Box, tintColor: Color.PrimaryText }}
            accessories={[{ tag: product.vendor }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Product"
                  icon={Icon.MagnifyingGlass}
                  target={<ProductDetail handle={product.handle} baseUrl={effectiveStoreRoute} />}
                />
                <Action.CopyToClipboard content={product.handle} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
