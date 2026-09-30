import { Action, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { autumn } from "../autumn";
import { MutatePromise } from "@raycast/utils";
import { Product } from "autumn-js";

export default function DeleteProductAction({
  productId,
  mutateProducts,
}: {
  productId: string;
  mutateProducts: MutatePromise<Product[]>;
}) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Product"
      onAction={() =>
        confirmAlert({
          title: "Delete Product",
          message: "Are you sure you want to delete this plan? This action cannot be undone.",
          primaryAction: {
            style: Alert.ActionStyle.Destructive,
            title: "Delete",
            async onAction() {
              const toast = await showToast(Toast.Style.Animated, "Deleting", productId);
              try {
                await mutateProducts(
                  autumn.products.delete(productId).then(({ error }) => {
                    if (error) throw new Error(error.message);
                  }),
                  {
                    optimisticUpdate(data) {
                      return data.filter((p) => p.id !== productId);
                    },
                    shouldRevalidateAfter: false,
                  },
                );
                toast.style = Toast.Style.Success;
                toast.title = "Deleted";
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed";
                toast.message = `${error}`;
              }
            },
          },
        })
      }
      style={Action.Style.Destructive}
    />
  );
}
