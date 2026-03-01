import { Action, Alert, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { autumn } from "../autumn";
import { MutatePromise } from "@raycast/utils";
import { Customer } from "autumn-js";

export default function DeleteCustomerAction({
  customerId,
  mutateCustomers,
}: {
  customerId: string;
  mutateCustomers: MutatePromise<Customer[]>;
}) {
  return (
    <Action
      icon={Icon.RemovePerson}
      title="Delete Customer"
      onAction={() =>
        confirmAlert({
          title: "Delete Customer",
          message: "Are you sure you want to delete this customer in Autumn? This action cannot be undone.",
          primaryAction: {
            style: Alert.ActionStyle.Destructive,
            title: "Delete",
            async onAction() {
              const delete_in_stripe = await confirmAlert({
                title: "Select whether to delete this customer in Stripe as well.",
                dismissAction: {
                  title: "Delete in Autumn only",
                },
                primaryAction: {
                  style: Alert.ActionStyle.Destructive,
                  title: "Delete in Autumn and Stripe",
                },
                rememberUserChoice: true,
              });
              const toast = await showToast(Toast.Style.Animated, "Deleting", customerId);
              try {
                await mutateCustomers(
                  autumn.customers
                    .delete(customerId, {
                      delete_in_stripe,
                    })
                    .then(({ error }) => {
                      if (error) throw new Error(error.message);
                    }),
                  {
                    optimisticUpdate(data) {
                      return data.filter((c) => c.id !== customerId);
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
      shortcut={Keyboard.Shortcut.Common.Remove}
    />
  );
}
