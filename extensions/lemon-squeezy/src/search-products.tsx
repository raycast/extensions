import { lemonSqueezySetup, listProducts } from "@lemonsqueezy/lemonsqueezy.js";
import { Action, ActionPanel, getPreferenceValues, Grid } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";

export default function SearchProducts() {
  const {apiKey} = getPreferenceValues<Preferences>();

  const {isLoading, data: products = []} = useCachedPromise(async () => {
    lemonSqueezySetup({apiKey, onError(error) {
      throw new Error(error.message)
    }});
    const {data} = await listProducts();
    return data?.data
  });
  
  return <Grid isLoading={isLoading} searchBarPlaceholder="Searh products by name">
    {!isLoading && !products.length ? <Grid.EmptyView title="Create your first product" description="Adding products to your store is easy peasy.
    Create products in minutes and start making sales." actions={<ActionPanel>
      <Action.OpenInBrowser icon={getFavicon("https://app.lemonsqueezy.com/products/add")} title="New Product" url="https://app.lemonsqueezy.com/products/add" />
    </ActionPanel>} /> :
    products.map(product => <Grid.Item key={product.id} content={product.attributes.thumb_url} title={product.attributes.name} subtitle={product.attributes.price_formatted} actions={<ActionPanel>
      <Action.OpenInBrowser url={`https://app.lemonsqueezy.com/products/${product.id}`} />
    </ActionPanel>} />)}
  </Grid>
}
