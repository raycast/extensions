import { useState, useEffect } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { createBoxCached, listCurrenciesCached } from "./api/cached";
import { Currency } from "./types";
import { createBoxSchema, validateInput } from "./validation/schemas";
import { getErrorMessage } from "./utils/error-handler";
import { SUCCESS_MESSAGES } from "./constants";

interface CreateBoxProps {
  onCreate?: () => void;
}

export default function CreateBoxCommand({ onCreate }: CreateBoxProps) {
  const { pop } = useNavigation();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nameError, setNameError] = useState<string | undefined>();

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

  async function handleSubmit(values: { name: string; description: string; baseCurrencyId: string }) {
    // Clear previous errors
    setNameError(undefined);

    // Validate input using Zod schema
    const validation = validateInput(createBoxSchema, values);

    if (!validation.success) {
      // Set field-specific errors
      const nameValidationError = validation.errors.find((e) => e.startsWith("name:"));
      if (nameValidationError) {
        setNameError(nameValidationError.replace("name: ", ""));
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: validation.errors.join(", "),
      });
      return;
    }

    try {
      setIsLoading(true);
      await createBoxCached(validation.data);

      showToast({
        style: Toast.Style.Success,
        title: SUCCESS_MESSAGES.BOX_CREATED,
      });

      onCreate?.();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create box",
        message: getErrorMessage(error),
      });
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Box" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter box name (e.g., Ramadan Charity)"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextArea id="description" title="Description" placeholder="Optional description" />
      <Form.Dropdown
        id="baseCurrencyId"
        title="Base Currency"
        info="Defaults to USD if not selected. Cannot be changed after sadaqahs are added."
      >
        <Form.Dropdown.Item value="" title="Default (USD)" />
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
