import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import React, { useState } from "react";
import { ClaudeCodeConfig } from "../types";
import { createProfile } from "../utils/cc-switch-db";

interface CreateProfileFormProps {
  onSuccess: () => void;
  initialValues?: {
    name: string;
    description: string;
    config: ClaudeCodeConfig;
  };
}

export default function CreateProfileForm({ onSuccess, initialValues }: CreateProfileFormProps) {
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
      const config: ClaudeCodeConfig = {
        ...(initialValues?.config || {}),
        apiKey: values.apiKey || undefined,
        model: values.model || undefined,
        customInstructions: values.customInstructions || undefined,
      };

      await createProfile({
        name: values.name,
        description: values.description,
        config,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Profile Created",
        message: `Created ${values.name}`,
      });

      onSuccess();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create profile",
        message: (error as Error).message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Profile" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="Production, Development, Personal..."
        error={nameError}
        onChange={() => setNameError(undefined)}
        defaultValue={initialValues?.name}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional description"
        defaultValue={initialValues?.description}
      />
      <Form.Separator />
      <Form.TextField
        id="apiKey"
        title="API Key"
        placeholder="sk-ant-..."
        defaultValue={initialValues?.config?.apiKey}
      />
      <Form.Dropdown
        id="model"
        title="Model"
        defaultValue={initialValues?.config?.model || "claude-sonnet-4-5-20250929"}
      >
        <Form.Dropdown.Item value="claude-sonnet-4-5-20250929" title="Claude Sonnet 4.5" />
        <Form.Dropdown.Item value="claude-opus-4-5-20251101" title="Claude Opus 4.5" />
        <Form.Dropdown.Item value="claude-3-5-sonnet-20241022" title="Claude 3.5 Sonnet" />
        <Form.Dropdown.Item value="claude-3-5-haiku-20241022" title="Claude 3.5 Haiku" />
      </Form.Dropdown>
      <Form.TextArea
        id="customInstructions"
        title="Custom Instructions"
        placeholder="Optional custom instructions for Claude..."
        defaultValue={initialValues?.config?.customInstructions}
      />
      <Form.Description text="You can further customize this profile's MCP servers and other settings after creation." />
    </Form>
  );
}
