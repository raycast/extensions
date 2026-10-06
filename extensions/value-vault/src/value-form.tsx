import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
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

export default function ValueForm({ initialValues, navigationTitle, submitTitle, onSubmit, onSuccess }: Props) {
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

  // Auto-detection runs until the user picks a type by hand, and never
  // rewrites a value that hasn't been edited (e.g. a saved type on the edit form).
  const initialValueRef = useRef(initialValues.value);
  const initialTypeRef = useRef(initialValues.type);
  const [typeTouched, setTypeTouched] = useState(false);

  useEffect(() => {
    if (typeTouched) return;
    if (values.value === initialValueRef.current) {
      // Text restored to its original: put back the saved type instead of
      // leaving whatever detection guessed mid-edit.
      if (parseValueType(values.type) !== parseValueType(initialTypeRef.current)) {
        itemProps.type.onChange?.(initialTypeRef.current);
      }
      return;
    }
    if (detectedType && detectedType !== parseValueType(values.type)) {
      itemProps.type.onChange?.(detectedType);
    }
  }, [values.value, values.type, typeTouched, detectedType, itemProps.type]);

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
      <Form.TextArea title="Value" placeholder="Paste or type the value to store..." {...itemProps.value} />
      <Form.Dropdown
        title="Type"
        info={
          detectedType && detectedType !== parseValueType(values.type) ? `Detected type: ${detectedType}` : undefined
        }
        {...itemProps.type}
        onChange={(newValue) => {
          setTypeTouched(true);
          itemProps.type.onChange?.(newValue);
        }}
      >
        {VALUE_TYPE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
