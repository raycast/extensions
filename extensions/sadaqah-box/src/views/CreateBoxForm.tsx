import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { createBoxCached } from "../api/cached";
import { useCurrencies } from "../hooks/useCurrencies";
import { createBoxSchema, validateInput } from "../validation/schemas";
import { getErrorMessage } from "../utils/error-handler";
import { SUCCESS_MESSAGES } from "../constants";

interface CreateBoxProps {
  onCreate?: () => void;
}

export default function CreateBoxForm({ onCreate }: CreateBoxProps) {
  const { pop } = useNavigation();
  const { data: currencies, isLoading: isLoadingCurrencies } = useCurrencies();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [descriptionError, setDescriptionError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; description: string; baseCurrencyId: string }) {
    setNameError(undefined);
    setDescriptionError(undefined);

    const validation = validateInput(createBoxSchema, values);

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
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoadingCurrencies || isSubmitting}
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
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description"
        error={descriptionError}
        onChange={() => setDescriptionError(undefined)}
      />
      <Form.Dropdown
        id="baseCurrencyId"
        title="Base Currency"
        info="Defaults to Gold (XAU) if not selected. Cannot be changed after sadaqahs are added."
      >
        <Form.Dropdown.Item value="" title="Default (XAU)" />
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
