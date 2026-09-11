import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import React, { useState } from "react";
import { Profile } from "../types";
import { updateProfile } from "../utils/cc-switch-db";

interface EditProfileFormProps {
  profile: Profile;
  onUpdate: () => void;
}

export default function EditProfileForm({ profile, onUpdate }: EditProfileFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: {
    name: string;
    description: string;
    apiKey: string;
    model: string;
    customInstructions: string;
  }) {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }

    try {
      await updateProfile(profile.id, {
        name: values.name,
        description: values.description,
        config: {
          ...profile.config,
          apiKey: values.apiKey || undefined,
          model: values.model || undefined,
          customInstructions: values.customInstructions || undefined,
        },
      });

      showToast({
        style: Toast.Style.Success,
        title: "Profile Updated",
        message: `Updated ${values.name}`,
      });

      onUpdate();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update profile",
        message: (error as Error).message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Profile" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="Production, Development, Personal..."
        error={nameError}
        onChange={() => setNameError(undefined)}
        defaultValue={profile.name}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional description"
        defaultValue={profile.description}
      />
      <Form.Separator />
      <Form.TextField id="apiKey" title="API Key" placeholder="sk-ant-..." defaultValue={profile.config.apiKey} />
      <Form.Dropdown id="model" title="Model" defaultValue={profile.config.model || "claude-sonnet-4-5-20250929"}>
        <Form.Dropdown.Item value="claude-sonnet-4-5-20250929" title="Claude Sonnet 4.5" />
        <Form.Dropdown.Item value="claude-opus-4-5-20251101" title="Claude Opus 4.5" />
        <Form.Dropdown.Item value="claude-3-5-sonnet-20241022" title="Claude 3.5 Sonnet" />
        <Form.Dropdown.Item value="claude-3-5-haiku-20241022" title="Claude 3.5 Haiku" />
      </Form.Dropdown>
      <Form.TextArea
        id="customInstructions"
        title="Custom Instructions"
        placeholder="Optional custom instructions for Claude..."
        defaultValue={profile.config.customInstructions}
      />
    </Form>
  );
}
