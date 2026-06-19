import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { feedPet } from "./api";

type InventoryEntry = [key: string, count: number];

interface FeedFormProps {
  foodKey: string;
  pets: InventoryEntry[];
  onSubmitted: () => void;
}

export default function FeedForm({ foodKey, pets, onSubmitted }: FeedFormProps) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: { pet: string; amount: string }) {
    const pet = values.pet;
    const amount = Math.max(1, Math.min(50, parseInt(values.amount, 10) || 1));
    if (!pet) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a pet" });
      return;
    }
    try {
      setSubmitting(true);
      await showToast({ style: Toast.Style.Animated, title: `Feeding ${pet}…` });
      await feedPet(pet, foodKey, amount);
      await showToast({ style: Toast.Style.Success, title: "Pet fed!" });
      onSubmitted();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to feed pet",
        message: String(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={`Feed With ${foodKey}`}
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Feed Pet" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Food" text={foodKey} />
      {pets.length === 0 ? (
        <Form.Description title="Pet" text="You have no pets to feed. Hatch one first!" />
      ) : (
        <Form.Dropdown id="pet" title="Pet">
          {pets.map(([k, c]) => (
            <Form.Dropdown.Item key={k} value={k} title={`${k} (×${c})`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        id="amount"
        title="Amount"
        defaultValue="1"
        info="Pets eat 50 units before becoming mounts. Preferred food: 5 units. Other: 2 units."
      />
    </Form>
  );
}
