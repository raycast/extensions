import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { addPreset, updatePreset } from "../storage/presets-storage";
import { Currency, Preset } from "../types";
import { presetFormSchema, validateField, validateInput } from "../validation/schemas";
import { getErrorMessage } from "../utils/error-handler";
import { SUCCESS_MESSAGES } from "../constants";

interface PresetFormProps {
  preset?: Preset;
  currencies: Currency[];
  onSuccess: () => void;
}

interface PresetFormValues {
  name: string;
  value: string;
  amount: string;
  currencyId: string;
}

export default function PresetForm({ preset, currencies, onSuccess }: PresetFormProps) {
  const { pop } = useNavigation();
  const isEditing = Boolean(preset);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps } = useForm<PresetFormValues>({
    initialValues: {
      name: preset?.name ?? "",
      value: preset ? String(preset.value) : "",
      amount: preset?.amount ? String(preset.amount) : "",
      currencyId: preset?.currencyId ?? currencies[0]?.id ?? "",
    },
    validation: {
      name: (val) => validateField(presetFormSchema, "name", val ?? ""),
      value: (val) => validateField(presetFormSchema, "value", val ?? ""),
      amount: (val) => validateField(presetFormSchema, "amount", val),
      currencyId: (val) => validateField(presetFormSchema, "currencyId", val ?? ""),
    },
    async onSubmit(values) {
      const validation = validateInput(presetFormSchema, values);
      if (!validation.success) {
        return;
      }

      const { name, value, currencyId, amount } = validation.data;

      try {
        setIsSubmitting(true);
        if (preset) {
          await updatePreset(preset.id, { name, value, currencyId, amount });
        } else {
          await addPreset(name, value, currencyId, amount);
        }

        await showToast({
          style: Toast.Style.Success,
          title: isEditing ? SUCCESS_MESSAGES.PRESET_UPDATED : SUCCESS_MESSAGES.PRESET_CREATED,
        });

        onSuccess();
        pop();
      } catch (error) {
        await showFailureToast(new Error(getErrorMessage(error)), {
          title: isEditing ? "Failed to update preset" : "Failed to create preset",
        });
        setIsSubmitting(false);
      }
    },
  });

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={isEditing ? `Edit Preset: ${preset?.name}` : "Create Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Preset" : "Create Preset"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Preset Name"
        placeholder="e.g., Daily Sadaqah, Jumu'ah Charity"
        info="A descriptive name for this preset"
        {...itemProps.name}
      />
      <Form.TextField
        title="Value"
        placeholder="Enter value (e.g., 10.50)"
        info="The monetary value of the sadaqah"
        {...itemProps.value}
      />
      <Form.TextField
        title="Amount (Count)"
        placeholder="Number of sadaqahs (default: 1)"
        info="Multiplier count (1–1,000); values are summed into a single sadaqah when triggered"
        {...itemProps.amount}
      />
      <Form.Dropdown title="Currency" info="Select currency for this preset" {...itemProps.currencyId}>
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
