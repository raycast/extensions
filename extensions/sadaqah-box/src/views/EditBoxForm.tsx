import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { updateBoxCached } from "../api/cached";
import { useCurrencies } from "../hooks/useCurrencies";
import { Box, UpdateBoxRequest } from "../types";
import { createBoxSchema, updateBoxSchema, validateField, validateInput } from "../validation/schemas";
import { getErrorMessage } from "../utils/error-handler";
import { SUCCESS_MESSAGES } from "../constants";

interface EditBoxProps {
  box: Box;
  onUpdate: () => void;
}

interface EditBoxFormValues {
  name: string;
  description: string;
  baseCurrencyId: string;
}

export default function EditBoxForm({ box, onUpdate }: EditBoxProps) {
  const { pop } = useNavigation();
  const { data: currencies, isLoading: isLoadingCurrencies } = useCurrencies();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps } = useForm<EditBoxFormValues>({
    initialValues: {
      name: box.name,
      description: box.description || "",
      baseCurrencyId: "",
    },
    validation: {
      name: (val) => validateField(createBoxSchema, "name", val ?? ""),
      description: (val) => validateField(updateBoxSchema, "description", val),
    },
    async onSubmit(values) {
      const validation = validateInput(updateBoxSchema, values);
      if (!validation.success) {
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
            await showToast({
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

        await showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.BOX_UPDATED,
        });

        onUpdate();
        pop();
      } catch (error) {
        await showFailureToast(new Error(getErrorMessage(error)), {
          title: "Failed to update box",
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
          <Action.SubmitForm title="Update Box" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter box name" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="Optional description" {...itemProps.description} />
      <Form.Dropdown
        title="Base Currency"
        info={box.count > 0 ? "Cannot change: box has sadaqahs" : "Can only be changed if box has no sadaqahs"}
        {...itemProps.baseCurrencyId}
      >
        <Form.Dropdown.Item value="" title={`Default (${box.baseCurrency?.code || box.baseCurrencyId})`} />
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
