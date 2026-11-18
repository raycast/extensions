import { Action, ActionPanel } from "@raycast/api";
import { useStore } from "../../providers/store-provider/store-provider";
import { useProductsList } from "../../queries/products/list-products.query";
import ListContainer from "../list-container";
import ProductDetails from "./product-details";
import ProductListItem from "./product-list-item";

const ProductList = () => {
  const { data: products, isLoading } = useProductsList();
  const { store } = useStore();

  return (
    <ListContainer isLoading={isLoading} navigationTitle={`Products • ${store?.name || "No Store Selected"}`}>
      {products?.map((product) => (
        <ProductListItem
          key={product.id}
          product={product}
          actions={
            <ActionPanel title={product.name}>
              <Action.Push title="View Details" target={<ProductDetails product={product} />} />
              <Action.CopyToClipboard title="Copy Product ID" content={product.id} />
              <Action.OpenInBrowser
                title="Open"
                url={`https://dashboard.paynow.gg/products/${product.id}?s=${store?.slug}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </ListContainer>
  );
};

export default ProductList;
