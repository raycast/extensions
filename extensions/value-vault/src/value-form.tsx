import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { ValueEntry, detectType, parseValueType, VALUE_TYPE_OPTIONS } from "./types";

interface FormValues {
  label: string;
  value: string;
  type: string;
}

interface Props {
  initialValues: FormValues;
  navigationTitle: string;
  submitTitle: string;
  onSubmit: (entry: Omit<ValueEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onSuccess?: () => void;
}

export default function ValueForm({
  initialValues,
  navigationTitle,
  submitTitle,
  onSubmit,
  onSuccess,
}: Props) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    onSubmit: async (formValues) => {
      const parsedType = parseValueType(formValues.type);
      if (!parsedType) {
        showToast({ style: Toast.Style.Failure, title: "Invalid type selected" });
        return;
      }
      try {
        await onSubmit({
          label: formValues.label.trim(),
          // Values are stored verbatim: trailing spaces can be significant in secrets.
          value: formValues.value,
          type: parsedType,
        });
        onSuccess?.();
        pop();
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to save value",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },
    validation: {
      label: FormValidation.Required,
      value: FormValidation.Required,
    },
    initialValues,
  });

  const detectedType = values.value ? detectType(values.value) : null;

  useEffect(() => {
    if (detectedType && detectedType !== parseValueType(values.type)) {
      itemProps.type.onChange?.(detectedType);
    }
  }, [detectedType, values.type]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle={navigationTitle}
    >
      <Form.TextField title="Label" placeholder="My label" autoFocus {...itemProps.label} />
      <Form.TextArea
        title="Value"
        placeholder="Paste or type the value to store..."
        {...itemProps.value}
      />
      <Form.Dropdown
        title="Type"
        info={
          detectedType && detectedType !== parseValueType(values.type)
            ? `Detected type: ${detectedType}`
            : undefined
        }
        {...itemProps.type}
      >
        {VALUE_TYPE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
