import { Form, ActionPanel, Action, showToast, Toast, Icon, confirmAlert, useNavigation, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, Fragment } from "react";
import { Provider } from "../../types";
import { useProviders } from "../../hooks/useProviders";

/**
 * Props for ProviderForm component
 */
interface ProviderFormProps {
  /** Initial provider data (for editing) or undefined (for creating new) */
  provider?: Provider;
  /** Callback to refresh providers list in parent component */
  onSave?: () => void;
}

/**
 * Form component for creating/editing AI provider configuration
 */
export function ProviderForm({ provider, onSave }: ProviderFormProps) {
  const { providers, putProvider } = useProviders();
  const { pop } = useNavigation();
  // Basic provider fields
  const [id, setId] = useState(provider?.id || "");
  const [name, setName] = useState(provider?.name || "");
  const [baseUrl, setBaseUrl] = useState(provider?.base_url || "");

  // API keys state - array of {key: string, value: string}
  const [apiKeys, setApiKeys] = useState<Array<{ key: string; value: string }>>(() => {
    if (provider?.api_keys) {
      return Object.entries(provider.api_keys).map(([key, value]) => ({ key, value }));
    }
    return [];
  });

  // Additional parameters state - stored as JSON string
  const [additionalParamsJson, setAdditionalParamsJson] = useState(() => {
    if (provider?.additional_parameters) {
      return JSON.stringify(provider.additional_parameters, null, 2);
    }
    return "";
  });

  /**
   * Returns validation error for provider ID or undefined if valid
   * (Validates required + uniqueness)
   */
  const getIdError = (value: string): string | undefined => {
    if (!value.trim()) {
      return "Required";
    }
    const idExists = providers.filter((p) => p.id !== provider?.id).some((p) => p.id === value.trim());

    return idExists ? `Already exists` : undefined;
  };

  /**
   * Returns validation error for base URL or undefined if valid
   * (Validates required + URL format)
   */
  const getBaseUrlError = (value: string): string | undefined => {
    if (!value.trim()) {
      return "Required";
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "Must be http or https";
      }
    } catch {
      return "Must be a valid URL (e.g., https://api.example.com)";
    }
    return undefined;
  };

  /**
   * Returns validation error for additional parameters JSON or undefined if valid
   */
  const getAdditionalParamsError = (jsonString: string): string | undefined => {
    if (!jsonString.trim()) {
      return undefined;
    }
    try {
      JSON.parse(jsonString);
      return undefined;
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid JSON";
    }
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async () => {
    // Show confirmation alert
    const confirmed = await confirmAlert({
      title: provider ? "Save Changes?" : "Create Provider?",
      message: provider
        ? `Are you sure you want to save changes to "${name}"?`
        : `Are you sure you want to create a new provider "${name}"?`,
      primaryAction: {
        title: provider ? "Save" : "Create",
      },
    });

    if (!confirmed) {
      return;
    }

    // Build api_keys object
    const apiKeysObj: Record<string, string> = {};
    apiKeys.forEach(({ key, value }) => {
      if (key.trim()) {
        apiKeysObj[key.trim()] = value.trim();
      }
    });

    // Parse additional_parameters (validation already done in real-time)
    let additionalParams: Record<string, unknown> | undefined;
    if (additionalParamsJson.trim()) {
      additionalParams = JSON.parse(additionalParamsJson) as Record<string, unknown>;
    }

    const providerData: Provider = {
      id: id.trim(),
      name: name.trim(),
      base_url: baseUrl.trim(),
      ...(Object.keys(apiKeysObj).length > 0 && { api_keys: apiKeysObj }),
      ...(additionalParams && { additional_parameters: additionalParams }),
      models: provider ? provider.models : [],
    };

    try {
      // Pass oldProviderId if ID was changed (for renaming)
      putProvider(providerData, provider?.id);

      await showToast({
        style: Toast.Style.Success,
        title: provider ? "Provider Saved" : "Provider Created",
        message: `"${providerData.name}" has been ${provider ? "saved" : "created"} successfully`,
      });

      // Notify parent component to refresh
      if (onSave) {
        onSave();
      }

      // Navigate back
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Error" });
    }
  };

  /**
   * Adds a new API key field
   * Only adds if the last API key is filled
   */
  const addApiKey = () => {
    // Check if there are any API keys and if the last one is filled
    if (apiKeys.length > 0) {
      const lastApiKey = apiKeys[apiKeys.length - 1];
      if (!lastApiKey.key.trim() || !lastApiKey.value.trim()) {
        showToast({
          style: Toast.Style.Failure,
          title: "Cannot Add API Key",
          message: "Please fill in the previous API key fields before adding a new one",
        });
        return;
      }
    }
    setApiKeys([...apiKeys, { key: "", value: "" }]);
  };

  /**
   * Removes an API key field (marks for deletion in draft state)
   */
  const removeApiKey = (index: number) => {
    setApiKeys(apiKeys.filter((_, i) => i !== index));
  };

  /**
   * Updates an API key field
   */
  const updateApiKey = (index: number, field: "key" | "value", value: string) => {
    const updated = [...apiKeys];
    updated[index] = { ...updated[index], [field]: value };
    setApiKeys(updated);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={provider ? "Save Changes" : "Create Provider"}
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            onSubmit={handleSubmit}
          />

          <ActionPanel.Section>
            <Action
              title="Add New API Key"
              icon={{ source: Icon.Key }}
              onAction={addApiKey}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            {apiKeys.length > 0 && (
              <ActionPanel.Submenu
                title="Remove API Key"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              >
                {apiKeys.map((apiKey, index) => (
                  <Action
                    key={`remove-api-key-${index}`}
                    title={`${apiKey.key || `API Key ${index + 1}`}`}
                    onAction={() => removeApiKey(index)}
                    style={Action.Style.Destructive}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="id"
        title="Provider ID"
        placeholder="perplexity"
        value={id}
        onChange={setId}
        error={getIdError(id)}
      />

      <Form.TextField
        id="name"
        title="Provider Name"
        placeholder="Perplexity"
        value={name}
        onChange={setName}
        error={!name.trim() ? "Required" : undefined}
        info="Name displayed in Raycast"
      />

      <Form.TextField
        id="base_url"
        title="Base URL"
        placeholder="https://api.perplexity.ai"
        value={baseUrl}
        onChange={setBaseUrl}
        error={getBaseUrlError(baseUrl)}
      />

      <Form.Separator />
      <Form.Description title="API Keys" text="Specify at least one api key if authentication is required" />

      {apiKeys.map((apiKey, index) => (
        <Fragment key={`api-key-fragment-${index}`}>
          {apiKeys.length > 1 && <Form.Description key={`api-key-header-${index}`} text={`API Key №${index + 1}`} />}
          <Form.TextField
            id={`api-key-${index}-key`}
            title="Key Name"
            placeholder="perplexity/openai/my-own-model"
            value={apiKey.key}
            onChange={(value) => updateApiKey(index, "key", value)}
            error={!apiKey.key.trim() ? "Required" : undefined}
          />
          <Form.PasswordField
            id={`api-key-${index}-value`}
            title="Key Value"
            placeholder="PERPLEXITY_KEY"
            value={apiKey.value}
            onChange={(value) => updateApiKey(index, "value", value)}
            error={!apiKey.value.trim() ? "Required" : undefined}
          />
        </Fragment>
      ))}

      <Form.Description title="" text="Press ⌘ + N to add new API Key" />

      <Form.Separator />
      <Form.TextArea
        id="additional_parameters"
        title="Additional Parameters"
        placeholder={`{
  "return_images": true,
  "web_search_options": {
    "search_context_size": "medium"
  }
}`}
        value={additionalParamsJson}
        onChange={setAdditionalParamsJson}
        error={getAdditionalParamsError(additionalParamsJson)}
        info="JSON object with additional parameters sent to /chat/completions endpoint"
      />
    </Form>
  );
}
