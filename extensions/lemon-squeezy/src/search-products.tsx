import { listProducts } from "@lemonsqueezy/lemonsqueezy.js";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { configureLemonSqueezy } from "./lemon-squeezy";

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
          description="Adding products to your store is easy peasy.
    Create products in minutes and start making sales."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={getFavicon("https://app.lemonsqueezy.com/products/add")}
                title="New Product"
                url="https://app.lemonsqueezy.com/products/add"
              />
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
                <Action.OpenInBrowser url={`https://app.lemonsqueezy.com/products/${product.id}`} />
                <Action.OpenInBrowser
                  icon={getFavicon("https://app.lemonsqueezy.com/products/add")}
                  title="New Product"
                  url="https://app.lemonsqueezy.com/products/add"
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
