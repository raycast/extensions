import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import React from "react";
import { Folder, FolderItem } from "../types";
import { updateFolder } from "../storage";
import { isValidUrl, normalizeUrl } from "../favicon";

interface WebsiteEditFormProps {
  folder: Folder;
  item: FolderItem;
  onSave: () => void | Promise<void>;
}

interface FormValues {
  name: string;
  url: string;
}

export default function WebsiteEditForm({ folder, item, onSave }: WebsiteEditFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      name: item.name,
      url: item.url || "",
    },
    validation: {
      name: FormValidation.Required,
      url: (value) => {
        if (!value) return "URL is required";
        const normalized = normalizeUrl(value);
        if (!isValidUrl(normalized)) return "Invalid URL";
      },
    },
    async onSubmit(values) {
      const normalizedUrl = normalizeUrl(values.url);

      // Update the item in the folder
      const updatedItems = folder.items.map((i) =>
        i.id === item.id
          ? {
              ...i,
              name: values.name,
              url: normalizedUrl,
            }
          : i,
      );

      await updateFolder(folder.id, { items: updatedItems });

      await showToast({ style: Toast.Style.Success, title: "Website updated" });
      await onSave();
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Edit Website"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Website name" {...itemProps.name} />
      <Form.TextField title="URL" placeholder="https://example.com" {...itemProps.url} />
    </Form>
  );
}
