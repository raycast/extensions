import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { addPreset, updatePreset } from "../storage/presets-storage";
import { Currency, Preset } from "../types";
import { presetFormSchema, validateInput } from "../validation/schemas";
import { getErrorMessage } from "../utils/error-handler";
import { SUCCESS_MESSAGES } from "../constants";

interface PresetFormProps {
  preset?: Preset;
  currencies: Currency[];
  onSuccess: () => void;
}

export default function PresetForm({ preset, currencies, onSuccess }: PresetFormProps) {
  const { pop } = useNavigation();
  const isEditing = Boolean(preset);

  const [nameError, setNameError] = useState<string | undefined>();
  const [valueError, setValueError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();
  const [currencyError, setCurrencyError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; value: string; amount: string; currencyId: string }) {
    setNameError(undefined);
    setValueError(undefined);
    setAmountError(undefined);
    setCurrencyError(undefined);

    const validation = validateInput(presetFormSchema, values);

    if (!validation.success) {
      setNameError(validation.fieldErrors.name);
      setValueError(validation.fieldErrors.value);
      setAmountError(validation.fieldErrors.amount);
      setCurrencyError(validation.fieldErrors.currencyId);

      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: validation.errors.join(", "),
      });
      return;
    }

    const { name, value, currencyId, amount } = validation.data;

    try {
      if (preset) {
        await updatePreset(preset.id, { name, value, currencyId, amount });
      } else {
        await addPreset(name, value, currencyId, amount);
      }

      showToast({
        style: Toast.Style.Success,
        title: isEditing ? SUCCESS_MESSAGES.PRESET_UPDATED : SUCCESS_MESSAGES.PRESET_CREATED,
      });

      onSuccess();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: isEditing ? "Failed to update preset" : "Failed to create preset",
        message: getErrorMessage(error),
      });
    }
  }

  const defaultCurrencyId = preset?.currencyId ?? currencies[0]?.id;

  return (
    <Form
      navigationTitle={isEditing ? `Edit Preset: ${preset?.name}` : "Create Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Preset" : "Create Preset"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset Name"
        placeholder="e.g., Daily Sadaqah, Jumu'ah Charity"
        defaultValue={preset?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        info="A descriptive name for this preset"
      />
      <Form.TextField
        id="value"
        title="Value"
        placeholder="Enter value (e.g., 10.50)"
        defaultValue={preset ? String(preset.value) : undefined}
        error={valueError}
        onChange={() => setValueError(undefined)}
        info="The monetary value of the sadaqah"
      />
      <Form.TextField
        id="amount"
        title="Amount (Count)"
        placeholder="Number of sadaqahs (default: 1)"
        defaultValue={preset?.amount ? String(preset.amount) : ""}
        error={amountError}
        onChange={() => setAmountError(undefined)}
        info="Multiplier count (1–1,000); values are summed into a single sadaqah when triggered"
      />
      <Form.Dropdown
        id="currencyId"
        title="Currency"
        defaultValue={defaultCurrencyId}
        error={currencyError}
        onChange={() => setCurrencyError(undefined)}
        info="Select currency for this preset"
      >
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
