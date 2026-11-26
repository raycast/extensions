import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { createBoxCached } from "../api/cached";
import { useCurrencies } from "../hooks/useCurrencies";
import { createBoxSchema, validateField, validateInput } from "../validation/schemas";
import { getErrorMessage } from "../utils/error-handler";
import { SUCCESS_MESSAGES } from "../constants";

interface CreateBoxProps {
  onCreate?: () => void;
}

interface CreateBoxFormValues {
  name: string;
  description: string;
  baseCurrencyId: string;
}

export default function CreateBoxForm({ onCreate }: CreateBoxProps) {
  const { pop } = useNavigation();
  const { data: currencies, isLoading: isLoadingCurrencies } = useCurrencies();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps } = useForm<CreateBoxFormValues>({
    initialValues: {
      name: "",
      description: "",
      baseCurrencyId: "",
    },
    validation: {
      name: (val) => validateField(createBoxSchema, "name", val ?? ""),
      description: (val) => validateField(createBoxSchema, "description", val),
    },
    async onSubmit(values) {
      const validation = validateInput(createBoxSchema, values);
      if (!validation.success) {
        return;
      }

      try {
        setIsSubmitting(true);
        await createBoxCached(validation.data);

        await showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.BOX_CREATED,
        });

        onCreate?.();
        pop();
      } catch (error) {
        await showFailureToast(new Error(getErrorMessage(error)), {
          title: "Failed to create box",
        });
        setIsSubmitting(false);
      }
    },
  });

  return (
    <Form
      isLoading={isLoadingCurrencies || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Box" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter box name (e.g., Ramadan Charity)" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="Optional description" {...itemProps.description} />
      <Form.Dropdown
        title="Base Currency"
        info="Defaults to Gold (XAU) if not selected. Cannot be changed after sadaqahs are added."
        {...itemProps.baseCurrencyId}
      >
        <Form.Dropdown.Item value="" title="Default (XAU)" />
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
