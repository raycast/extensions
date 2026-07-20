import { useState, useEffect } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { updateBoxCached, listCurrenciesCached } from "./api/cached";
import { Box, Currency } from "./types";
import { updateBoxSchema, validateInput } from "./validation/schemas";
import { getErrorMessage } from "./utils/error-handler";
import { SUCCESS_MESSAGES } from "./constants";

interface EditBoxProps {
  box: Box;
  onUpdate: () => void;
}

export default function EditBoxCommand({ box, onUpdate }: EditBoxProps) {
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
    const validation = validateInput(updateBoxSchema, values);

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

      // Build update data only with changed fields
      const updateData: { name?: string; description?: string; baseCurrencyId?: string } = {};

      if (validation.data.name && validation.data.name !== box.name) {
        updateData.name = validation.data.name;
      }

      if (validation.data.description !== undefined) {
        updateData.description = validation.data.description;
      }

      if (values.baseCurrencyId && values.baseCurrencyId !== box.baseCurrencyId) {
        // Only update if box has no sadaqahs
        if (box.count > 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "Cannot change base currency",
            message: "Base currency can only be changed if box has no sadaqahs",
          });
          setIsLoading(false);
          return;
        }
        updateData.baseCurrencyId = values.baseCurrencyId;
      }

      // Only make API call if there are changes
      if (Object.keys(updateData).length === 0) {
        pop();
        return;
      }

      await updateBoxCached(box.id, updateData);

      showToast({
        style: Toast.Style.Success,
        title: SUCCESS_MESSAGES.BOX_UPDATED,
      });

      onUpdate();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update box",
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
          <Action.SubmitForm title="Update Box" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={box.name}
        placeholder="Enter box name"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={box.description || ""}
        placeholder="Optional description"
      />
      <Form.Dropdown
        id="baseCurrencyId"
        title="Base Currency"
        info={box.count > 0 ? "Cannot change: box has sadaqahs" : "Can only be changed if box has no sadaqahs"}
      >
        <Form.Dropdown.Item value="" title={`Default (${box.baseCurrency?.code || box.baseCurrencyId})`} />
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
