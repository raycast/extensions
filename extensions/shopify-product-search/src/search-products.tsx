import { getSelectedText, Detail, Icon, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

// Get preferences
const preferences = getPreferenceValues<{
  accessToken: string;
  storeName: string;
}>();

// Constants
const SHOPIFY_API_VERSION = "2024-01";

interface Product {
  id: string;
  title: string;
  image: {
    src: string;
  };
  variants: Array<{
    id: string;
    sku: string;
    inventory_item_id: string;
  }>;
}

interface InventoryLevel {
  available: number;
  inventory_item_id: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productInfo, setProductInfo] = useState<{
    sku: string; 
    quantity: number;
    imageUrl: string;
    title: string;
  } | null>(null);

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) return { color: "#e74c3c", text: "Out of Stock", icon: Icon.XMarkCircle };
    if (quantity < 10) return { color: "#f39c12", text: "Low Stock", icon: Icon.ExclamationMark };
    return { color: "#2ecc71", text: "In Stock", icon: Icon.CheckCircle };
  };

  useEffect(() => {
    async function searchProduct(searchText: string) {
      try {
        const productResponse = await fetch(
          `https://${preferences.storeName}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/products.json?title=${encodeURIComponent(
            searchText
          )}`,
          {
            headers: {
              "X-Shopify-Access-Token": preferences.accessToken,
              "Content-Type": "application/json",
            },
          }
        );

        const productData = await productResponse.json();
        
        if (!productData.products || productData.products.length === 0) {
          setError("No matching product found");
          return;
        }

        const product = productData.products[0];
        const variant = product.variants[0];
        
        const inventoryResponse = await fetch(
          `https://${preferences.storeName}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/inventory_levels.json?inventory_item_ids=${variant.inventory_item_id}`,
          {
            headers: {
              "X-Shopify-Access-Token": preferences.accessToken,
              "Content-Type": "application/json",
            },
          }
        );

        const inventoryData = await inventoryResponse.json();
        const inventoryLevel = inventoryData.inventory_levels[0];

        setProductInfo({
          sku: variant.sku,
          quantity: inventoryLevel.available,
          imageUrl: product.image?.src || "",
          title: product.title
        });

      } catch (error) {
        setError("Failed to fetch product information");
      } finally {
        setIsLoading(false);
      }
    }

    async function init() {
      try {
        const text = await getSelectedText();
        if (text) {
          await searchProduct(text);
        } else {
          setError("No text selected");
          setIsLoading(false);
        }
      } catch (error) {
        setError("Failed to get selected text");
        setIsLoading(false);
      }
    }

    init();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  if (productInfo) {
    const stockStatus = getStockStatus(productInfo.quantity);

    return (
      <Detail
        markdown={`<img src="${productInfo.imageUrl}" width="300" />`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Product Title"
              text={productInfo.title}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="SKU"
              text={productInfo.sku}
              icon={Icon.Barcode}
            />
            <Detail.Metadata.Label
              title="Stock Level"
              text={`${productInfo.quantity}`}
              icon={stockStatus.icon}
            />
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={stockStatus.text}
                color={stockStatus.color}
              />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy SKU"
              content={productInfo.sku}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail markdown="No results found" />;
}
