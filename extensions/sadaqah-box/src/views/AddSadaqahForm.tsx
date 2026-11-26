import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { addSadaqahCached } from "../api/cached";
import { useCurrencies } from "../hooks/useCurrencies";
import { Box } from "../types";
import { addSadaqahSchema, validateInput } from "../validation/schemas";
import { getErrorMessage } from "../utils/error-handler";
import { SUCCESS_MESSAGES } from "../constants";

interface AddSadaqahProps {
  box: Box;
  onAdd: () => void;
}

export default function AddSadaqahForm({ box, onAdd }: AddSadaqahProps) {
  const { pop } = useNavigation();
  const { data: currencies, isLoading: isLoadingCurrencies } = useCurrencies();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [valueError, setValueError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();

  async function handleSubmit(values: { amount: string; value: string; currencyId: string }) {
    setValueError(undefined);
    setAmountError(undefined);

    const validation = validateInput(addSadaqahSchema, values);

    if (!validation.success) {
      setValueError(validation.fieldErrors.value);
      setAmountError(validation.fieldErrors.amount);

      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: validation.errors.join(", "),
      });
      return;
    }

    const { amount, value, currencyId } = validation.data;
    // Backend addSadaqah uses `input.value ?? input.amount`, so multiply value * amount client-side
    const totalValue = value !== undefined && amount !== undefined ? value * amount : (value ?? amount);

    try {
      setIsSubmitting(true);
      await addSadaqahCached(box.id, {
        amount,
        value: totalValue,
        currencyId: currencyId || box.baseCurrencyId,
      });

      showToast({
        style: Toast.Style.Success,
        title: SUCCESS_MESSAGES.SADAQAH_ADDED,
      });

      onAdd();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add sadaqah",
        message: getErrorMessage(error),
      });
      setIsSubmitting(false);
    }
  }

  const defaultCurrency = box.baseCurrency || currencies.find((c) => c.id === box.baseCurrencyId);

  return (
    <Form
      isLoading={isLoadingCurrencies || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Sadaqah" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Box" text={`${box.name} (Base: ${defaultCurrency?.code || box.baseCurrencyId})`} />
      <Form.TextField
        id="value"
        title="Value"
        placeholder="Enter value (e.g., 10.50)"
        error={valueError}
        onChange={() => setValueError(undefined)}
        info="The monetary value per item (multiplied by amount if both are provided)"
      />
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="Enter amount (e.g., 5)"
        error={amountError}
        onChange={() => setAmountError(undefined)}
        info="The number of coins/items"
      />
      <Form.Dropdown id="currencyId" title="Currency" info="Defaults to box's base currency">
        <Form.Dropdown.Item value="" title={`Default (${defaultCurrency?.code || box.baseCurrencyId})`} />
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
