import { Form, ActionPanel, Action, showToast, Toast, Icon, confirmAlert, useNavigation, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, Fragment } from "react";
import { Provider, Model, Abilities } from "../../types";
import { useProviders } from "../../hooks/useProviders";

/**
 * Props for ProviderForm component
 */
interface ProviderFormProps {
  /** Initial provider data (for editing) or undefined (for creating new) */
  provider?: Provider;
  /** Callback to refresh providers list in parent component */
  onSave?: () => void;
  /** Model ID to auto-focus on its first TextField */
  modelId?: string;
}

/**
 * Form component for creating/editing AI provider configuration
 */
export function ProviderForm({ provider, onSave, modelId }: ProviderFormProps) {
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

  // Models state - ensure at least one empty model if models array is empty
  const [models, setModels] = useState<Model[]>(() => {
    const initialModels = provider?.models || [];
    // If no models, initialize with one empty model
    if (initialModels.length === 0) {
      return [
        {
          id: "",
          name: "",
          context: NaN,
        },
      ];
    }
    return initialModels;
  });

  // Initialize models if provider is provided and models array is empty
  useEffect(() => {
    if (provider && models.length === 0 && provider.models.length > 0) {
      setModels(provider.models);
    }
  }, [provider]);

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
      models: models,
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

  /**
   * Adds a new model
   * Only adds if the last model is filled
   */
  const addModel = () => {
    // Check if there are any models and if the last one is filled
    if (models.length > 0) {
      const lastModel = models[models.length - 1];
      if (!lastModel.id.trim() || !lastModel.name.trim() || isNaN(lastModel.context)) {
        showToast({
          style: Toast.Style.Failure,
          title: "Cannot Add Model",
          message: "Please fill in the previous model fields (ID, Name, Context) before adding a new one",
        });
        return;
      }
    }
    const newModel: Model = {
      id: "",
      name: "",
      context: 128000,
    };
    setModels([...models, newModel]);
  };

  /**
   * Removes a model (marks for deletion in draft state)
   */
  const removeModel = (index: number) => {
    const filteredModels = models.filter((_, i) => i !== index);

    // If no models left, add one empty model
    if (filteredModels.length === 0) {
      const newModel: Model = {
        id: "",
        name: "",
        context: 128000,
      };
      setModels([newModel]);
    } else {
      setModels(filteredModels);
    }
  };

  /**
   * Updates a model field
   */
  const updateModel = (index: number, field: keyof Model, value: string | number | Model["abilities"] | undefined) => {
    const updated = [...models];
    updated[index] = { ...updated[index], [field]: value };
    setModels(updated);
  };

  /**
   * Updates model abilities
   */
  const updateModelAbility = (modelIndex: number, abilityName: keyof Abilities, supported: boolean) => {
    const updated = [...models];
    const model = updated[modelIndex];
    if (!model.abilities) {
      model.abilities = {};
    }
    model.abilities[abilityName] = { supported };
    setModels(updated);
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
              title="Add New Model"
              icon={Icon.Box}
              onAction={addModel}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            {models.length > 0 && (
              <ActionPanel.Submenu
                title="Remove Model"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              >
                {models.map((model, index) => (
                  <Action
                    key={`remove-model-${index}`}
                    title={`${model.name || model.id || `Model ${index + 1}`}`}
                    onAction={() => removeModel(index)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Add New API Key"
              icon={{ source: Icon.Key }}
              onAction={addApiKey}
              shortcut={{ modifiers: ["cmd", "opt"], key: "n" }}
            />
            {apiKeys.length > 0 && (
              <ActionPanel.Submenu
                title="Remove API Key"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={{ modifiers: ["ctrl", "opt"], key: "x" }}
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
            placeholder="perplexity/openai/anthropic/my-ownm-odel/etc"
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

      <Form.Description title="" text="Press ⌘ + ⌥ + N to add new API Key" />

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

      <Form.Separator />

      {models.map((model, modelIndex) => (
        <Fragment key={`model-fragment-${modelIndex}`}>
          {models.length > 1 && (
            <Form.Description key={`model-header-${modelIndex}`} text={`Model №${modelIndex + 1}`} />
          )}
          <Form.TextField
            id={`model-${modelIndex}-id`}
            title="Model ID"
            placeholder="sonar"
            value={model.id}
            onChange={(value) => updateModel(modelIndex, "id", value)}
            error={!model.id.trim() ? "Required" : undefined}
            autoFocus={model.id === modelId}
          />

          <Form.TextField
            id={`model-${modelIndex}-name`}
            title="Model Name"
            placeholder="Sonar"
            value={model.name}
            onChange={(value) => updateModel(modelIndex, "name", value)}
            error={!model.name.trim() ? "Required" : undefined}
          />

          <Form.TextArea
            id={`model-${modelIndex}-description`}
            title="Description"
            placeholder="Optional description of the model"
            value={model.description || ""}
            onChange={(value) => updateModel(modelIndex, "description", value || undefined)}
          />

          {apiKeys.length > 1 && (
            <Form.Dropdown
              id={`model-${modelIndex}-provider`}
              title="Provider Key"
              value={model.provider || ""}
              placeholder="Select a provider key"
              onChange={(value) => updateModel(modelIndex, "provider", value || undefined)}
            >
              <Form.Dropdown.Item value="" title="None" />
              <Form.Dropdown.Section>
                {apiKeys.map(({ key }) => (
                  <Form.Dropdown.Item key={key} value={key} title={key} />
                ))}
              </Form.Dropdown.Section>
            </Form.Dropdown>
          )}

          <Form.TextField
            id={`model-${modelIndex}-context`}
            title="Context Window"
            placeholder="128000"
            value={String(model.context)}
            onChange={(value) => {
              const parsed = parseInt(value, 10);
              updateModel(modelIndex, "context", parsed || value);
            }}
            error={!String(model.context).trim() ? "Required" : isNaN(model.context) ? "Must be a number" : undefined}
          />

          <Form.Checkbox
            id={`model-${modelIndex}-ability-temperature`}
            label="Temperature"
            value={model.abilities?.temperature?.supported || false}
            onChange={(checked) => updateModelAbility(modelIndex, "temperature", checked)}
            info="Enable if the model supports temperature parameter for controlling randomness/creativity of responses"
          />

          <Form.Checkbox
            id={`model-${modelIndex}-ability-vision`}
            label="Vision"
            value={model.abilities?.vision?.supported || false}
            onChange={(checked) => updateModelAbility(modelIndex, "vision", checked)}
            info="Enable if the model can process and understand images (multimodal capabilities)"
          />

          <Form.Checkbox
            id={`model-${modelIndex}-ability-system_message`}
            label="System Message"
            value={model.abilities?.system_message?.supported || false}
            onChange={(checked) => updateModelAbility(modelIndex, "system_message", checked)}
            info="Enable if the model supports system messages for setting behavior and context"
          />

          <Form.Checkbox
            id={`model-${modelIndex}-ability-tools`}
            label="Tools"
            value={model.abilities?.tools?.supported || false}
            onChange={(checked) => updateModelAbility(modelIndex, "tools", checked)}
            info="Enable if the model supports function calling and tool usage (e.g., API calls, code execution)"
          />

          <Form.Checkbox
            id={`model-${modelIndex}-ability-reasoning_effort`}
            label="Reasoning Effort"
            value={model.abilities?.reasoning_effort?.supported || false}
            onChange={(checked) => updateModelAbility(modelIndex, "reasoning_effort", checked)}
            info="Enable if the model supports reasoning effort parameter for controlling depth of thinking"
          />

          {modelIndex < models.length - 1 && <Form.Separator key={`model-separator-${modelIndex}`} />}
        </Fragment>
      ))}

      <Form.Description title="" text="Press ⌘ + N to add new Model" />
    </Form>
  );
}
