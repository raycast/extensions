import { ActionPanel, Form, Action, showToast, Toast, LocalStorage, useNavigation, Icon } from "@raycast/api";
import React, { useState } from "react";
import { DifyAppType, DifyApp, DifyConversationType } from "./utils/types";

interface FormValues {
  name: string;
  endpoint: string;
  apiKey: string;
  inputs: string;
  type: string;
  assistantName: string;
  responseMode: string;
  waitForResponse: string;
  conversationType: string;
  description: string;
}

// DifyApp interface is imported from list-dify.tsx

/**
 * Sanitize API endpoint by removing trailing spaces and ensuring proper format
 */
function sanitizeEndpoint(endpoint: string): string {
  // Remove leading and trailing spaces
  let sanitized = endpoint.trim();

  // Remove trailing slash if it exists
  if (sanitized.endsWith("/")) {
    sanitized = sanitized.slice(0, -1);
  }

  return sanitized;
}

export default function Command() {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [endpointError, setEndpointError] = useState<string | undefined>();
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();
  const [inputsError, setInputsError] = useState<string | undefined>();

  // Form validation
  function validateName(value: string) {
    if (!value || value.trim().length === 0) {
      setNameError("Required");
      return false;
    }
    setNameError(undefined);
    return true;
  }

  function validateEndpoint(value: string) {
    // If empty, we'll use the default value
    if (!value || value.trim().length === 0) {
      setEndpointError(undefined);
      return true;
    }

    try {
      new URL(sanitizeEndpoint(value));
    } catch (error) {
      setEndpointError("Invalid URL");
      return false;
    }

    setEndpointError(undefined);
    return true;
  }

  function validateApiKey(value: string) {
    if (!value || value.trim().length === 0) {
      setApiKeyError("Required");
      return false;
    }
    setApiKeyError(undefined);
    return true;
  }

  // Handle form submission
  async function handleSubmit(values: FormValues) {
    // Validate form
    const isNameValid = validateName(values.name);
    const isEndpointValid = validateEndpoint(values.endpoint);
    const isApiKeyValid = validateApiKey(values.apiKey);
    // No validation needed for inputs
    setInputsError(undefined);
    const isInputsValid = true;

    if (!isNameValid || !isEndpointValid || !isApiKeyValid || !isInputsValid) {
      return;
    }

    try {
      // Parse inputs from comma-separated values to empty object with keys
      const parsedInputs: Record<string, string> = {};
      if (values.inputs && values.inputs.trim().length > 0) {
        // First try to split by comma (both English and Chinese commas)
        const inputText = values.inputs.trim();
        let inputFields: string[];

        if (inputText.match(/[,，]/)) {
          // If commas are present, split by them
          inputFields = inputText.split(/[,，]/).map((field) => field.trim());
        } else {
          // If no commas, treat each word as a separate field
          inputFields = inputText.split(/\s+/);
        }

        // Create an object with each field as a key with empty string value
        inputFields.forEach((field) => {
          if (field) {
            parsedInputs[field] = "";
          }
        });
      }

      // Create new app object
      // Use default endpoint if not provided
      const defaultEndpoint = "https://api.dify.ai/v1";

      // Create timestamp with timezone information
      const now = new Date();
      const timestamp = now.toISOString();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const formattedTimestamp = `${timestamp} (${timezone})`;

      const newApp: DifyApp = {
        name: values.name.trim(),
        endpoint: values.endpoint.trim() ? sanitizeEndpoint(values.endpoint) : defaultEndpoint,
        apiKey: values.apiKey.trim(),
        inputs: parsedInputs,
        type: (values.type as DifyAppType) || DifyAppType.ChatflowAgent, // Default to Chatflow/Agent type
        assistantName: values.assistantName.trim(), // Assistant name, can be empty
        responseMode: values.responseMode, // Response mode
        waitForResponse: values.waitForResponse === "true", // Wait mode
        conversationType: (values.conversationType as DifyConversationType) || DifyConversationType.Continuous, // Conversation type
        description: values.description.trim(), // LLM description,
        createdAt: formattedTimestamp, // Add creation timestamp
        updatedAt: formattedTimestamp, // Initial update timestamp is same as creation
      };

      // Get existing application list
      const existingAppsJson = await LocalStorage.getItem<string>("dify-apps");
      const existingApps: DifyApp[] = existingAppsJson ? JSON.parse(existingAppsJson) : [];

      // Check if application with same name exists
      if (existingApps.some((app) => app.name === newApp.name)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Application Already Exists",
          message: `An application named "${newApp.name}" already exists. Please use a different name.`,
        });
        return;
      }

      // Add new application to list
      const updatedApps = [...existingApps, newApp];

      // Save updated list
      await LocalStorage.setItem("dify-apps", JSON.stringify(updatedApps));

      // Show success message
      await showToast({
        style: Toast.Style.Success,
        title: "Dify Application Added",
        message: `Successfully added application: ${newApp.name}`,
      });

      // Return to previous screen
      pop();
    } catch (error) {
      // Handle error
      console.error("Error adding Dify application:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Dify Application",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Add Application" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Application Name"
        placeholder="My Dify App"
        error={nameError}
        info="Required. A unique name to identify this Dify application."
        onChange={(value) => {
          if (nameError && value.trim().length > 0) {
            setNameError(undefined);
          }
        }}
        onBlur={(event) => {
          validateName(event.target.value || "");
        }}
      />
      <Form.TextField
        id="endpoint"
        title="API Endpoint"
        placeholder="https://api.dify.ai/v1"
        error={endpointError}
        info="The base URL of your Dify API. Default is https://api.dify.ai/v1"
        onChange={(value) => {
          if (endpointError && value.trim().length > 0) {
            setEndpointError(undefined);
          }
        }}
        onBlur={(event) => {
          validateEndpoint(event.target.value || "");
        }}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Your Dify API Key"
        error={apiKeyError}
        info="Required. The API key for your Dify application. Must match the selected App Type."
        onChange={(value) => {
          if (apiKeyError && value.trim().length > 0) {
            setApiKeyError(undefined);
          }
        }}
        onBlur={(event) => {
          validateApiKey(event.target.value || "");
        }}
      />
      <Form.TextField
        id="assistantName"
        title="Assistant Name (Optional)"
        placeholder="Dify"
        info="Name to display for this assistant in conversations"
      />
      <Form.Dropdown
        id="type"
        title="App Type"
        defaultValue={DifyAppType.ChatflowAgent}
        info="Required. Must match the type of your Dify application. The API key must be for this specific app type."
      >
        <Form.Dropdown.Item value={DifyAppType.ChatflowAgent} title="Chatflow/Agent" />
        <Form.Dropdown.Item value={DifyAppType.Workflow} title="Workflow" />
        <Form.Dropdown.Item value={DifyAppType.TextGenerator} title="Text Generator" />
      </Form.Dropdown>
      <Form.Dropdown id="responseMode" title="Response Mode" defaultValue="blocking">
        <Form.Dropdown.Item value="blocking" title="Blocking (Wait for full response)" />
        <Form.Dropdown.Item value="streaming" title="Streaming (Show response as it's generated)" />
      </Form.Dropdown>
      <Form.Dropdown id="waitForResponse" title="Wait Mode" defaultValue="true">
        <Form.Dropdown.Item value="true" title="Wait Mode (Wait for full response)" />
        <Form.Dropdown.Item value="false" title="Non-Wait Mode (Only check API call success)" />
      </Form.Dropdown>
      <Form.Dropdown id="conversationType" title="Conversation Type" defaultValue={DifyConversationType.Continuous}>
        <Form.Dropdown.Item value={DifyConversationType.Continuous} title="Continuous (Track conversation history)" />
        <Form.Dropdown.Item value={DifyConversationType.SingleCall} title="Single Call (No conversation tracking)" />
      </Form.Dropdown>
      <Form.TextArea
        id="inputs"
        title="Input Variables (Optional)"
        placeholder="var1, var2, var3"
        info="If your Dify app has input variables defined in the Start node, list them here as comma-separated values."
        error={inputsError}
        onChange={() => {
          setInputsError(undefined);
        }}
      />
      <Form.TextArea
        id="description"
        title="LLM Description (Optional)"
        placeholder="Add detailed notes about this LLM application..."
        info="Optional. Add detailed information about this LLM, such as capabilities, limitations, or special instructions."
      />
    </Form>
  );
}
