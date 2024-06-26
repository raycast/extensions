import { Action, ActionPanel, Form, Icon, LaunchProps, LaunchType, showToast, Toast } from "@raycast/api";
import { QueryClient, QueryClientProvider } from "react-query";
import { useForm, FormValidation } from "@raycast/utils";
import { useCreateItem } from "./utils/api"; // You will need to implement this API call

const queryClient = new QueryClient();

export default function AddItemWrapper(
  props: LaunchProps<{ arguments: { sku: string; description?: string; quantity?: number; cost?: number } }>,
) {
  return (
    <QueryClientProvider client={queryClient}>
      <AddItem arguments={props.arguments} launchType={LaunchType.UserInitiated} />
    </QueryClientProvider>
  );
}

interface ItemFormValues {
  sku: string;
  description?: string;
  quantity?: string;
  cost?: string;
}

function AddItem(
  props: LaunchProps<{ arguments: { sku?: string; description?: string; quantity?: number; cost?: number } }>,
) {
  const { sku: argumentSku, description: argumentDescription, quantity: argumentQuantity, cost: argumentCost } = props.arguments;
  const { mutate: addItem, isLoading } = useCreateItem();

  const { handleSubmit, itemProps, reset } = useForm<ItemFormValues>({
    onSubmit: async (values) => {
      addItem(
        {
          ...values,
          quantity: values.quantity ? parseInt(values.quantity, 10) : undefined,
          cost: values.cost ? parseFloat(values.cost) : undefined,
        },
        {
          onSuccess: async () => {
            reset();
            showToast({
              title: "Item added successfully",
              message: "The item has been added to your inventory.",
              style: Toast.Style.Success,
            });
          },
          onError: () => {
            showToast({
              title: "Failed to add item",
              message: "There was an error adding the item to your inventory.",
              style: Toast.Style.Failure,
            });
          },
        },
      );
    },
    validation: {
      sku: FormValidation.Required,
      description: FormValidation.Required,
      quantity: (value) => {
        if (value && (isNaN(parseInt(value, 10)) || parseInt(value, 10) <= 0)) {
          return "Quantity must be a positive number";
        }
      },
      cost: (value) => {
        if (value && (isNaN(parseFloat(value)) || parseFloat(value) <= 0)) {
          return "Cost must be a positive number";
        }
      },
    },
    initialValues: {
      sku: argumentSku || "",
      description: argumentDescription || "",
      quantity: argumentQuantity?.toString() || "",
      cost: argumentCost?.toString() || "",
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Item" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new item to your inventory." />
      <Form.TextField
        {...itemProps.sku}
        title="Item Code"
        placeholder="Enter SKU/ItemCode"
      />
      <Form.TextField
        {...itemProps.description}
        title="Description"
        placeholder="Enter item description"
      />
      <Form.TextField
        {...itemProps.quantity}
        title="Quantity"
        placeholder="Enter quantity"
      />
      <Form.TextField
        {...itemProps.cost}
        title="Cost"
        placeholder="Enter cost"
      />
    </Form>
  );
}
