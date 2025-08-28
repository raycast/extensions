import { ActionPanel, Action, Form, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { addCustomApp, updateCustomApp } from "../helpers/custom-app-utils";
import { safeAsyncOperation } from "../utils/errors";
import { CustomAppFormProps, CustomAppInput } from "../types";

export default function CustomAppForm({ app, onSave }: CustomAppFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  const isEditing = !!app;

  const validateUrlTemplate = (urlTemplate: string): string | undefined => {
    if (!urlTemplate.trim()) {
      return undefined; // Don't show error for empty field
    }

    if (!urlTemplate.includes("{profile}")) {
      return "URL template must contain {profile} placeholder";
    }

    try {
      const testUrl = urlTemplate.replace(/{profile}/g, "testuser");
      const parsedUrl = new URL(testUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return "URL template must use http:// or https:// protocol";
      }
    } catch (error) {
      return "URL template must be a valid URL format (e.g., https://example.com/{profile})";
    }

    return undefined;
  };

  const handleSubmit = async (values: { name: string; url: string; visible: boolean }) => {
    const input: CustomAppInput = {
      name: values.name,
      urlTemplate: values.url,
      visible: values.visible,
    };

    await safeAsyncOperation(
      async () => {
        let result;

        if (isEditing && app) {
          result = await updateCustomApp(app.id, input);
        } else {
          result = await addCustomApp(input);
        }

        if (result?.success) {
          onSave?.();
          pop();
        }
      },
      "Custom app form submission",
      { showToastOnError: false }, // addCustomApp/updateCustomApp handle their own error toasts
    );
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update App" : "Add App"}
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
        defaultValue={app?.urlTemplate || ""}
        error={urlError}
        onChange={(newValue) => {
          const error = validateUrlTemplate(newValue);
          setUrlError(error);
        }}
      />
      <Form.Description text="Use {profile} as the placeholder for the username." />
    </Form>
  );
}
