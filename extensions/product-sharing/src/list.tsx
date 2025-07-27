import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import Submit from "./submit";
import { isRecent } from "./utils";
import { deleteServerProductShare, getServerProductShares, publishProductShareTweet } from "./api/product-share";

export default function Command() {
  const [products, setProducts] = useState<GetProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const fetchProducts = async (keyword?: string) => {
    setIsLoading(true);
    try {
      const fetchedProducts = await getServerProductShares(keyword);
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      showFailureToast(error, { title: "Failed to fetch products" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchText.trim()) {
      fetchProducts(searchText);
    } else {
      fetchProducts();
    }
  }, [searchText]);

  const handleDelete = async (productId: string) => {
    try {
      await showToast(Toast.Style.Animated, "Deleting product...");
      await deleteServerProductShare(productId);
      await showToast(Toast.Style.Success, "Product deleted successfully");
      await fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      await showToast(Toast.Style.Failure, `Failed to delete product: ${(error as Error).message}`);
    }
  };

  const handlePublishTweet = async (product: GetProduct) => {
    try {
      await showToast(Toast.Style.Animated, "Publishing tweet...");
      await publishProductShareTweet(product.url);
      await showToast(Toast.Style.Success, "Tweet published successfully");
    } catch (error) {
      console.error("Failed to publish tweet:", error);
      await showToast(Toast.Style.Failure, `Failed to publish tweet: ${(error as Error).message}`);
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search products by name or keywords"
      throttle
    >
      {products.map((product: GetProduct) => (
        <List.Item
          key={product.id}
          title={product.title}
          accessories={getAccessories(product)}
          icon={getFavicon(product.url)}
          detail={
            <List.Item.Detail
              markdown={`
# ${product.title}

${product.description}

![Preview](${product.cover})

---

Shared: ${new Date(product.createdAt).toLocaleDateString()}
              `}
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={product.url} />

              <Action.Push
                title="Submit New Product"
                icon={Icon.PlusCircle}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<Submit onProductChange={() => fetchProducts()} />}
              />
              <Action.Push
                title="Edit Product"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<Submit editProduct={product} onProductChange={() => fetchProducts()} />}
              />
              <Action
                title="Publish Tweet"
                icon={Icon.Message}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => handlePublishTweet(product)}
              />
              <Action
                title="Delete Product"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                onAction={() => handleDelete(product.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getAccessories(product: GetProduct): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (product.recommended) {
    accessories.push({ icon: { source: Icon.StarCircle, tintColor: Color.Orange }, tooltip: "Recommended" });
  }
  if (isRecent(new Date(product.createdAt))) {
    accessories.push({ icon: { source: Icon.PlusCircle, tintColor: Color.Green }, tooltip: "New" });
  }

  return accessories;
}
