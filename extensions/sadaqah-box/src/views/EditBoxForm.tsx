import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { updateBoxCached } from "../api/cached";
import { useCurrencies } from "../hooks/useCurrencies";
import { Box, UpdateBoxRequest } from "../types";
import { updateBoxSchema, validateInput } from "../validation/schemas";
import { getErrorMessage } from "../utils/error-handler";
import { SUCCESS_MESSAGES } from "../constants";

interface EditBoxProps {
  box: Box;
  onUpdate: () => void;
}

export default function EditBoxForm({ box, onUpdate }: EditBoxProps) {
  const { pop } = useNavigation();
  const { data: currencies, isLoading: isLoadingCurrencies } = useCurrencies();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [descriptionError, setDescriptionError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; description: string; baseCurrencyId: string }) {
    setNameError(undefined);
    setDescriptionError(undefined);

    const validation = validateInput(updateBoxSchema, values);

    if (!validation.success) {
      setNameError(validation.fieldErrors.name);
      setDescriptionError(validation.fieldErrors.description);

      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: validation.errors.join(", "),
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const updateData: UpdateBoxRequest = {};

      if (validation.data.name && validation.data.name !== box.name) {
        updateData.name = validation.data.name;
      }

      const currentDescription = box.description ?? "";
      if (validation.data.description !== undefined && validation.data.description !== currentDescription) {
        updateData.description = validation.data.description;
      }

      if (values.baseCurrencyId && values.baseCurrencyId !== box.baseCurrencyId) {
        if (box.count > 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "Cannot change base currency",
            message: "Base currency can only be changed if box has no sadaqahs",
          });
          setIsSubmitting(false);
          return;
        }
        updateData.baseCurrencyId = values.baseCurrencyId;
      }

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
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoadingCurrencies || isSubmitting}
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
        error={descriptionError}
        onChange={() => setDescriptionError(undefined)}
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
