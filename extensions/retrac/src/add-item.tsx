import { Action, ActionPanel, Form, Icon, LaunchProps, LaunchType, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
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

function AddItem(
  props: LaunchProps<{ arguments: { sku?: string; description?: string; quantity?: number; cost?: number } }>,
) {
  const {
    sku: argumentSku,
    description: argumentDescription,
    quantity: argumentQuantity,
    cost: argumentCost,
  } = props.arguments;
  const [sku, setSku] = useState<string>(argumentSku ?? "");
  const [description, setDescription] = useState<string | undefined>(argumentDescription);
  const [quantity, setQuantity] = useState<number | undefined>(argumentQuantity);
  const [cost, setCost] = useState<number | undefined>(argumentCost);
  const { mutate: addItem, isLoading } = useCreateItem();

  async function handleSubmit() {
    addItem(
      { sku, description, quantity, cost },
      {
        onSuccess: async () => {
          setSku("");
          setDescription("");
          setQuantity(undefined);
          setCost(undefined);
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
  }

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
        id="sku"
        title="Item Code"
        placeholder="Enter SKU/ItemCode"
        value={sku}
        onChange={(newValue) => setSku(newValue)}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter item description"
        value={description}
        onChange={(newValue) => setDescription(newValue)}
      />
      <Form.TextField
        id="quantity"
        title="Quantity"
        placeholder="Enter quantity"
        value={quantity !== undefined ? quantity.toString() : ""}
        onChange={(newValue) => setQuantity(newValue ? parseInt(newValue, 10) : undefined)}
      />
      <Form.TextField
        id="cost"
        title="Cost"
        placeholder="Enter cost"
        value={cost !== undefined ? cost.toString() : ""}
        onChange={(newValue) => setCost(newValue ? parseFloat(newValue) : undefined)}
      />
    </Form>
  );
}
