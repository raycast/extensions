import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { addSadaqahCached } from "../api/cached";
import { useCurrencies } from "../hooks/useCurrencies";
import { Box } from "../types";
import { addSadaqahSchema, calculateTotalValue, validateField, validateInput } from "../validation/schemas";
import { getErrorMessage } from "../utils/error-handler";
import { SUCCESS_MESSAGES } from "../constants";

interface AddSadaqahProps {
  box: Box;
  onAdd: () => void;
}

interface AddSadaqahFormValues {
  value: string;
  amount: string;
  currencyId: string;
}

export default function AddSadaqahForm({ box, onAdd }: AddSadaqahProps) {
  const { pop } = useNavigation();
  const { data: currencies, isLoading: isLoadingCurrencies } = useCurrencies();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps, setValidationError } = useForm<AddSadaqahFormValues>({
    initialValues: {
      value: "",
      amount: "",
      currencyId: "",
    },
    validation: {
      value: (val) => validateField(addSadaqahSchema, "value", val),
      amount: (val) => validateField(addSadaqahSchema, "amount", val),
    },
    async onSubmit(values) {
      const validation = validateInput(addSadaqahSchema, values);

      if (!validation.success) {
        if (validation.fieldErrors.value) {
          setValidationError("value", validation.fieldErrors.value);
        }
        if (validation.fieldErrors.amount) {
          setValidationError("amount", validation.fieldErrors.amount);
        }
        return;
      }

      const { amount, value, currencyId } = validation.data;
      const totalValue =
        value !== undefined && amount !== undefined ? calculateTotalValue(value, amount) : (value ?? amount);

      try {
        setIsSubmitting(true);
        await addSadaqahCached(box.id, {
          value: totalValue,
          currencyId: currencyId || box.baseCurrencyId,
        });

        await showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.SADAQAH_ADDED,
        });

        onAdd();
        pop();
      } catch (error) {
        await showFailureToast(new Error(getErrorMessage(error)), {
          title: "Failed to add sadaqah",
        });
        setIsSubmitting(false);
      }
    },
  });

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
        title="Value"
        placeholder="Enter value (e.g., 10.50)"
        info="The monetary value per item (multiplied by amount and added as one entry)"
        {...itemProps.value}
      />
      <Form.TextField
        title="Amount"
        placeholder="Enter amount (e.g., 5)"
        info="Multiplier count (1–1,000, summed into one entry)"
        {...itemProps.amount}
      />
      <Form.Dropdown title="Currency" info="Defaults to box's base currency" {...itemProps.currencyId}>
        <Form.Dropdown.Item value="" title={`Default (${defaultCurrency?.code || box.baseCurrencyId})`} />
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
