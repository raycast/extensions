import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { getAccessToken, useFetch, withAccessToken } from "@raycast/utils";
import { ProductsResponse } from "./types";
import { ProductDetails } from "./product-details";
import { formatNumber } from "./utils";
import { BASE_URL, PRODUCTS_ENDPOINT } from "./const";
import { provider } from "./oauth";

export default withAccessToken(provider)(Command);

function Command() {
  const { token } = getAccessToken();
  const { data, isLoading } = useFetch<ProductsResponse>(`${BASE_URL}${PRODUCTS_ENDPOINT}?access_token=${token}`);

  return (
    <List isLoading={isLoading}>
      {data?.products.map((product) => (
        <List.Item
          key={product.id}
          title={product.name}
          subtitle={product.formatted_price}
          icon={
            product.thumbnail_url ? { source: product.thumbnail_url } : { source: Icon.Image, tintColor: Color.Magenta }
          }
          accessories={[
            {
              text: `${formatNumber(product.sales_count)} Sales`,
              icon: { source: Icon.Cart, tintColor: Color.Green },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<ProductDetails product={product} />} icon={Icon.Sidebar} />
              <Action.OpenInBrowser
                icon={{ source: product.thumbnail_url, fallback: Icon.Globe }}
                url={product.short_url}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
