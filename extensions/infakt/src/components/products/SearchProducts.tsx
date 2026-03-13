import { useEffect, useState } from "react";

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { ApiProduct } from "@/api/product";
import { UpdateProduct } from "@/components/products/UpdateProduct";
import { useProducts } from "@/hooks/useProducts";
import { ProductObject } from "@/types/product";
import { ApiPaginatedResponse } from "@/types/utils";
import { formatPrice } from "@/utils/formatters";

export function SearchProducts() {
  const [searchText, setSearchText] = useState("");
  const [filteredProducts, filterProducts] = useState<ProductObject[]>([]);

  const { productsIsLoading, productsData, productsMutate } = useProducts();

  useEffect(() => {
    if (!productsData) return;

    filterProducts(
      productsData.filter((product) => product?.name?.toLowerCase().includes(searchText?.toLowerCase())) ?? [],
    );
  }, [productsData, searchText]);

  return (
    <List
      isLoading={productsIsLoading}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search products..."
    >
      {filteredProducts?.map((product) => (
        <ProductListItem key={product.id} product={product} mutateProducts={productsMutate} />
      ))}
    </List>
  );
}

type ProductListItemProps = {
  product: ProductObject;
  mutateProducts: MutatePromise<ApiPaginatedResponse<ProductObject[]> | undefined>;
};

function ProductListItem({ product, mutateProducts }: ProductListItemProps) {
  const { push } = useNavigation();

  return (
    <List.Item
      title={product?.name ?? "No Product Name"}
      icon={{
        source: Icon.Document,
        tintColor: Color.PrimaryText,
      }}
      accessories={[
        {
          text: formatPrice(product?.gross_price ?? 0),
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Product Name"
              content={product?.name ?? "No Product Name"}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Product ID"
              content={product.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Product Gross Price"
              content={product?.gross_price ?? "No Product Gross Price"}
              shortcut={{ modifiers: ["opt", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Create Product"
              icon={Icon.NewDocument}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={async () => {
                await launchCommand({ name: "create_product", type: LaunchType.UserInitiated });
              }}
            />
            <Action
              title="Edit Product"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => {
                push(<UpdateProduct product={product} mutateProducts={mutateProducts} />);
              }}
            />
            <Action
              title="Delete Product"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                await confirmAlert({
                  title: "Delete Product",
                  message: "Are you sure you want to delete this product?",
                  icon: {
                    source: Icon.Trash,
                    tintColor: Color.Red,
                  },
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                    onAction: async () => {
                      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting product" });
                      try {
                        await mutateProducts(ApiProduct.delete(product.id));

                        toast.style = Toast.Style.Success;
                        toast.title = "Successfully deleted product 🎉";
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed to delete product 😥";
                        toast.message = error instanceof Error ? error.message : undefined;
                      }
                    },
                  },
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
