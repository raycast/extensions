import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { yazio } from "../utils/yazio";
import { isDevelopment } from "../utils/mockData";
import type { ProductSearchResult } from "../types";
interface LogFoodFormProps {
  product: ProductSearchResult;
}

export function LogFoodForm({ product }: LogFoodFormProps) {
  async function handleSubmit(values: { amount: string; daytime: string }) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Logging ${product.name}...`,
    });

    try {
      const amount = parseInt(values.amount, 10);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount.");
      }

      if (isDevelopment()) {
        // In development mode, simulate the API call without actually making it
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay

        toast.style = Toast.Style.Success;
        toast.title = "Logged Food Successfully (Mock)";
        toast.message = `${amount}g of ${product.name} added to your diary (development mode).`;
      } else {
        await yazio.user.addConsumedItem({
          id: crypto.randomUUID(), // The API requires a UUID, so we generate one
          product_id: product.product_id,
          date: new Date(),
          daytime: values.daytime as "breakfast" | "lunch" | "dinner" | "snack",
          amount: amount,
          // For simplicity, we'll log by gram amount for now
          serving: null,
          serving_quantity: null,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Logged Food Successfully";
        toast.message = `${amount}g of ${product.name} added to your diary.`;
      }

      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Log Food";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <Form
      navigationTitle={`Log ${product.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Checkmark} title="Log Food" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="amount" title="Amount (g)" placeholder="Enter amount in grams" />
      <Form.Dropdown id="daytime" title="Meal">
        <Form.Dropdown.Item value="breakfast" title="Breakfast" />
        <Form.Dropdown.Item value="lunch" title="Lunch" />
        <Form.Dropdown.Item value="dinner" title="Dinner" />
        <Form.Dropdown.Item value="snack" title="Snack" />
      </Form.Dropdown>
    </Form>
  );
}
