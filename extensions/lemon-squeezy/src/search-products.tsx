import { listProducts } from "@lemonsqueezy/lemonsqueezy.js";
import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { configureLemonSqueezy } from "./lemon-squeezy";
import OpenInLemonSqueezy from "./open-in-lemon-squeezy";

export default function SearchProducts() {
  const { isLoading, data: products = [] } = useCachedPromise(async () => {
    configureLemonSqueezy();
    const { data } = await listProducts();
    return data?.data;
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search products by name">
      {!isLoading && !products.length ? (
        <List.EmptyView
          title="Create your first product"
          description={`Adding products to your store is easy peasy.
    Create products in minutes and start making sales.`}
          actions={
            <ActionPanel>
              <OpenInLemonSqueezy title="New Product" route="products/add" />
            </ActionPanel>
          }
        />
      ) : (
        products.map((product) => (
          <List.Item
            key={product.id}
            icon={product.attributes.thumb_url || Icon.Box}
            title={product.attributes.name}
            subtitle={product.attributes.price_formatted}
            accessories={[
              {
                icon: Icon.Check,
                tag: {
                  value: product.attributes.status_formatted,
                  color: product.attributes.status === "published" ? Color.Green : undefined,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <OpenInLemonSqueezy route={`products/${product.id}`} />
                <OpenInLemonSqueezy title="New Product" route="products/add" />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
