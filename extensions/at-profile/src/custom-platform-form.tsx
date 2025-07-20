import { ActionPanel, Action, Form, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { addCustomApp, updateCustomApp, CustomAppInput } from "./custom-platform-utils";

interface CustomPlatformFormProps {
  platform?: {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
  };
  onSave?: () => void;
}

export default function CustomPlatformForm({ platform, onSave }: CustomPlatformFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  const isEditing = !!platform;

  const handleSubmit = async (values: { name: string; url: string; enabled: boolean }) => {
    const input: CustomAppInput = {
      name: values.name,
      urlTemplate: values.url,
      enabled: values.enabled,
    };

    try {
      let result;

      if (isEditing && platform) {
        result = await updateCustomApp(platform.id, input);
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
            title={isEditing ? "Update Platform" : "Add Platform"}
            icon={isEditing ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Platform Name"
        placeholder="e.g., Custom Social Network"
        defaultValue={platform?.name || ""}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="url"
        title="URL Template"
        placeholder="https://example.com/{profile}"
        info="Use {profile} as a placeholder for the username"
        defaultValue={platform?.url || ""}
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
      <Form.Checkbox
        id="enabled"
        title="Enabled"
        label="Include this platform in the profile search"
        defaultValue={platform?.enabled ?? true}
      />
      <Form.Separator />
      <Form.Description
        title="URL Template Help"
        text="The {profile} placeholder will be replaced with the actual username when opening a profile. For example: https://example.com/{profile} becomes https://example.com/username"
      />
    </Form>
  );
}
