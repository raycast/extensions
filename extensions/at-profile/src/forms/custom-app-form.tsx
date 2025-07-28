import { ActionPanel, Action, Form, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { addCustomApp, updateCustomApp } from "../utils/custom-app-utils";
import { CustomAppFormProps, CustomAppInput } from "../types";

export default function CustomAppForm({ app, onSave }: CustomAppFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  const isEditing = !!app;

  const handleSubmit = async (values: { name: string; url: string; enabled: boolean }) => {
    const input: CustomAppInput = {
      name: values.name,
      urlTemplate: values.url,
      enabled: values.enabled,
    };

    try {
      let result;

      if (isEditing && app) {
        result = await updateCustomApp(app.id, input);
      } else {
        result = await addCustomApp(input);
      }

      if (result.success) {
        onSave?.();
        pop();
      }
    } catch (error) {
      // Error handling and toasts are managed by the utility functions
      console.error("Error in form submission:", error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Social App" : "Add Social App"}
            icon={isEditing ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g., Custom Social Network"
        defaultValue={app?.name || ""}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="url"
        title="URL Template"
        placeholder="https://example.com/{profile}"
        info="Use {profile} as a placeholder for the profile name"
        defaultValue={app?.urlTemplate || ""}
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
      <Form.Checkbox id="enabled" title="Enabled" label="Enable" defaultValue={app?.enabled ?? true} />
    </Form>
  );
}
