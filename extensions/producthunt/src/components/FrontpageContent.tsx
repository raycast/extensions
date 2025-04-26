import { List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Product } from "../types";
import { ProductListItem } from "./ProductListItem";
import { getFrontpageProducts } from "../api/scraper";

/**
 * Shared component for displaying the frontpage content
 * Used by both the main frontpage command and the FrontpageWrapper
 */
export function FrontpageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        const { products, error } = await getFrontpageProducts();

        if (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load products",
            message: error,
          });
          setError(error);
        } else {
          setProducts(products);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load products",
          message: errorMessage,
        });
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search products...">
      {error ? (
        <List.EmptyView icon="no-view.png" title="Something went wrong" description={error} />
      ) : (
        <>
          <List.Section title="Today's Featured Launches">
            {products.map((product, index) => (
              <ProductListItem
                key={product.id}
                product={product}
                featured={true}
                index={index}
                totalProducts={products.length}
                allProducts={products}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
