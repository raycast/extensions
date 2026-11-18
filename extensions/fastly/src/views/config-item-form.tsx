import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { ConfigStore } from "../types";
import { createConfigStoreItem, updateConfigStoreItem, getConfigStoreItem } from "../api";
import { FormValidation, useForm } from "@raycast/utils";

interface ConfigItemFormProps {
  store: ConfigStore;
  itemKey?: string;
  onSaved?: () => void;
}

export function ConfigItemForm({ store, itemKey, onSaved }: ConfigItemFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingValue, setIsLoadingValue] = useState(!!itemKey);
  const { pop } = useNavigation();
  const isEditing = !!itemKey;

  const { handleSubmit, itemProps, setValue } = useForm<{ key: string; value: string }>({
    async onSubmit(values) {
      try {
        setIsLoading(true);
        const effectiveKey = isEditing ? itemKey! : values.key;

        if (isEditing) {
          await updateConfigStoreItem(store.id, effectiveKey, values.value);
        } else {
          await createConfigStoreItem(store.id, effectiveKey, values.value);
        }

        await showToast({
          style: Toast.Style.Success,
          title: isEditing ? "Item updated" : "Item created",
          message: effectiveKey,
        });
        onSaved?.();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: isEditing ? "Failed to update item" : "Failed to create item",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      key: itemKey || "",
      value: "",
    },
    validation: {
      key: isEditing ? undefined : FormValidation.Required,
      value: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (itemKey) {
      getConfigStoreItem(store.id, itemKey)
        .then((item) => {
          setValue("value", item.item_value);
        })
        .catch((error) => {
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
  }, [itemKey, store.id]);

  return (
    <Form
      isLoading={isLoading || isLoadingValue}
      navigationTitle={isEditing ? `Edit ${itemKey}` : `New Item in ${store.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Item" : "Create Item"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Store: ${store.name}`} />
      {isEditing ? (
        <Form.Description text={`Key: ${itemKey}`} />
      ) : (
        <Form.TextField title="Key" placeholder="e.g. feature_flags, api_url, rate_limit" {...itemProps.key} />
      )}
      <Form.TextArea
        title="Value"
        placeholder="Enter value (plain text or JSON)"
        info="Supports plain text or JSON. JSON values will be auto-formatted when viewed."
        {...itemProps.value}
      />
    </Form>
  );
}
