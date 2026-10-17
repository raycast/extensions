import { useState, useEffect } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { addSadaqahCached, listCurrenciesCached } from "./api/cached";
import { Box, Currency } from "./types";
import { addSadaqahSchema, validateInput } from "./validation/schemas";
import { getErrorMessage } from "./utils/error-handler";
import { SUCCESS_MESSAGES } from "./constants";

interface AddSadaqahProps {
  box: Box;
  onAdd: () => void;
}

export default function AddSadaqahCommand({ box, onAdd }: AddSadaqahProps) {
  const { pop } = useNavigation();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [valueError, setValueError] = useState<string | undefined>();

  useEffect(() => {
    async function fetchCurrencies() {
      try {
        const response = await listCurrenciesCached();
        setCurrencies(response.currencies);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load currencies",
          message: getErrorMessage(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCurrencies();
  }, []);

  async function handleSubmit(values: { amount: string; value: string; currencyId: string }) {
    // Clear previous errors
    setValueError(undefined);

    // Validate input using Zod schema
    const validation = validateInput(addSadaqahSchema, values);

    if (!validation.success) {
      // Set field-specific errors
      const amountError = validation.errors.find((e) => e.startsWith("amount:"));
      const valueErrorMsg = validation.errors.find((e) => e.startsWith("value:"));

      if (amountError || valueErrorMsg) {
        setValueError(amountError?.replace("amount: ", "") || valueErrorMsg?.replace("value: ", ""));
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: validation.errors.join(", "),
      });
      return;
    }

    const { amount, value, currencyId } = validation.data;

    // Check that at least one of amount or value is provided
    if (!amount && !value) {
      setValueError("Either amount or value is required");
      return;
    }

    try {
      setIsLoading(true);
      await addSadaqahCached(box.id, {
        amount,
        value,
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
      setIsLoading(false);
    }
  }

  const defaultCurrency = box.baseCurrency || currencies.find((c) => c.id === box.baseCurrencyId);

  return (
    <Form
      isLoading={isLoading}
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
        info="The monetary value of the sadaqah"
      />
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="Enter amount (e.g., 5)"
        error={valueError}
        onChange={() => setValueError(undefined)}
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
