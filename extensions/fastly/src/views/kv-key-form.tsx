import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { KVStore } from "../types";
import { setKVStoreKeyValue, getKVStoreKeyValue } from "../api";
import { FormValidation, useForm } from "@raycast/utils";

interface KVKeyFormProps {
  store: KVStore;
  keyName?: string;
  onSaved?: () => void;
}

export function KVKeyForm({ store, keyName, onSaved }: KVKeyFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingValue, setIsLoadingValue] = useState(!!keyName);
  const { pop } = useNavigation();
  const isEditing = !!keyName;

  const { handleSubmit, itemProps, setValue } = useForm<{ keyName: string; value: string }>({
    async onSubmit(values) {
      try {
        setIsLoading(true);
        const effectiveKeyName = isEditing ? keyName! : values.keyName;
        await setKVStoreKeyValue(store.id, effectiveKeyName, values.value);
        await showToast({
          style: Toast.Style.Success,
          title: isEditing ? "Key updated" : "Key created",
          message: effectiveKeyName,
        });
        onSaved?.();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: isEditing ? "Failed to update key" : "Failed to create key",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      keyName: keyName || "",
      value: "",
    },
    validation: {
      keyName: isEditing ? undefined : FormValidation.Required,
      value: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (keyName) {
      getKVStoreKeyValue(store.id, keyName)
        .then((value) => {
          setValue("value", value);
        })
        .catch((error) => {
          console.error("Error loading key value:", error);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load current value",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        })
        .finally(() => {
          setIsLoadingValue(false);
        });
    }
  }, [keyName, store.id]);

  return (
    <Form
      isLoading={isLoading || isLoadingValue}
      navigationTitle={isEditing ? `Edit ${keyName}` : `New Key in ${store.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Key" : "Create Key"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Store: ${store.name}`} />
      {isEditing ? (
        <Form.Description text={`Key: ${keyName}`} />
      ) : (
        <Form.TextField title="Key Name" placeholder="Enter key name" {...itemProps.keyName} />
      )}
      <Form.TextArea
        title="Value"
        placeholder="Enter value"
        info="Supports plain text or JSON. Large values are accepted."
        {...itemProps.value}
      />
    </Form>
  );
}
