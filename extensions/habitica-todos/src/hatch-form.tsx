import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { hatchPet } from "./api";

type InventoryEntry = [key: string, count: number];

interface HatchFormProps {
  /** When provided, the egg side is pinned and only the potion is selectable. */
  eggKey?: string;
  /** When provided, the potion side is pinned and only the egg is selectable. */
  potionKey?: string;
  eggs?: InventoryEntry[];
  potions?: InventoryEntry[];
  onSubmitted: () => void;
}

export default function HatchForm({ eggKey, potionKey, eggs, potions, onSubmitted }: HatchFormProps) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: { egg: string; potion: string }) {
    const egg = eggKey ?? values.egg;
    const potion = potionKey ?? values.potion;
    if (!egg || !potion) {
      await showToast({ style: Toast.Style.Failure, title: "Pick both an egg and a potion" });
      return;
    }
    try {
      setSubmitting(true);
      await showToast({ style: Toast.Style.Animated, title: "Hatching…" });
      await hatchPet(egg, potion);
      await showToast({ style: Toast.Style.Success, title: `Hatched ${egg}-${potion}!` });
      onSubmitted();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to hatch",
        message: String(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Hatch Pet"
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Hatch Pet" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {eggKey ? (
        <Form.Description title="Egg" text={eggKey} />
      ) : (eggs ?? []).length === 0 ? (
        <Form.Description title="Egg" text="No eggs in inventory" />
      ) : (
        <Form.Dropdown id="egg" title="Egg">
          {(eggs ?? []).map(([k, c]) => (
            <Form.Dropdown.Item key={k} value={k} title={`${k} (×${c})`} />
          ))}
        </Form.Dropdown>
      )}
      {potionKey ? (
        <Form.Description title="Hatching Potion" text={potionKey} />
      ) : (potions ?? []).length === 0 ? (
        <Form.Description title="Hatching Potion" text="No hatching potions in inventory" />
      ) : (
        <Form.Dropdown id="potion" title="Hatching Potion">
          {(potions ?? []).map(([k, c]) => (
            <Form.Dropdown.Item key={k} value={k} title={`${k} (×${c})`} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
