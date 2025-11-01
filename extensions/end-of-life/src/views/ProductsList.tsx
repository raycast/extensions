import { ActionPanel, Action, List, Icon, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { AllProductsResponse } from "../types";
import ProductDetails from "./ProductDetails";

export default function ProductsList() {
  const { push } = useNavigation();
  const { data, isLoading } = useFetch<AllProductsResponse>("https://endoflife.date/api/v1/products");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search products...">
      <List.Section title="Products">
        {data?.result.map((product) => (
          <List.Item
            id={product.name}
            key={product.name}
            title={product.label}
            subtitle={product.aliases.join(", ")}
            accessories={product.tags.map((tag) => ({ tag }))}
            actions={
              <ActionPanel title={product.label}>
                <Action
                  title={`View ${product.label} Releases`}
                  onAction={() => push(<ProductDetails product={product.name} />)}
                />
                <Action.OpenInBrowser
                  title="View on Endoflife.date"
                  url={`https://endoflife.date/${product.name}`}
                  icon={Icon.Globe}
                />
              </ActionPanel>
            }
          />
        )) || []}
      </List.Section>
    </List>
  );
}
