import { Form, ActionPanel, Action, showToast, Toast, Icon, confirmAlert, useNavigation, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { Provider, Model, Abilities } from "../../types";
import { useProviders } from "../../hooks/useProviders";

/**
 * Props for ModelForm component
 */
interface ModelFormProps {
  /** Provider that this model belongs to (required) */
  provider: Provider;
  /** Initial model data (for editing) or undefined (for creating new) */
  model?: Model;
  /** Callback to refresh providers list in parent component */
  onSave?: () => void;
}

/**
 * Form component for creating/editing AI model configuration
 */
export function ModelForm({ provider, model, onSave }: ModelFormProps) {
  const { putModel } = useProviders();
  const { pop } = useNavigation();

  // Model fields
  const [id, setId] = useState(model?.id || "");
  const [name, setName] = useState(model?.name || "");
  const [description, setDescription] = useState(model?.description || "");
  const [providerKey, setProviderKey] = useState(model?.provider || "");
  const [context, setContext] = useState(model?.context || 128000);
  const [abilities, setAbilities] = useState<Abilities>(model?.abilities || {});

  /**
   * Returns validation error for model ID or undefined if valid
   * (Validates required + uniqueness within provider)
   */
  const getIdError = (value: string): string | undefined => {
    if (!value.trim()) {
      return "Required";
    }

    const idExists = provider.models.filter((m) => m.id !== model?.id).some((m) => m.id === value.trim());

    return idExists ? `Already exists` : undefined;
  };

  /**
   * Returns validation error for context window or undefined if valid
   */
  const getContextError = (value: number): string | undefined => {
    if (isNaN(value)) {
      return "Must be a number";
    }
    if (value <= 0) {
      return "Must be greater than 0";
    }
    return undefined;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async () => {
    // Show confirmation alert
    const confirmed = await confirmAlert({
      title: model ? "Save Changes?" : "Create Model?",
      message: model
        ? `Are you sure you want to save changes to "${name}"?`
        : `Are you sure you want to create a new model "${name}"?`,
      primaryAction: {
        title: model ? "Save" : "Create",
      },
    });

    if (!confirmed) {
      return;
    }

    const modelData: Model = {
      id: id.trim(),
      name: name.trim(),
      context: context,
      ...(description.trim() && { description: description.trim() }),
      ...(providerKey.trim() && { provider: providerKey.trim() }),
      ...(Object.keys(abilities).length > 0 && { abilities }),
    };

    try {
      // Pass oldModelId if ID was changed (for renaming)
      putModel(provider.id, modelData, model?.id);

      await showToast({
        style: Toast.Style.Success,
        title: model ? "Model Saved" : "Model Created",
        message: `"${modelData.name}" has been ${model ? "saved" : "created"} successfully`,
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
   * Updates model abilities
   */
  const updateModelAbility = (abilityName: keyof Abilities, supported: boolean) => {
    const updatedAbilities = { ...abilities };
    if (supported) {
      updatedAbilities[abilityName] = { supported };
    } else {
      delete updatedAbilities[abilityName];
    }
    setAbilities(updatedAbilities);
  };

  // Get API keys for provider dropdown
  const apiKeys = provider.api_keys ? Object.keys(provider.api_keys) : [];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={model ? "Save Changes" : "Create Model"}
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="id" title="Model ID" placeholder="sonar" value={id} onChange={setId} error={getIdError(id)} />

      <Form.TextField
        id="name"
        title="Model Name"
        placeholder="Sonar"
        value={name}
        onChange={setName}
        error={!name.trim() ? "Required" : undefined}
        info="Name displayed in Raycast"
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description of the model"
        value={description}
        onChange={setDescription}
      />

      {apiKeys.length > 1 && (
        <Form.Dropdown
          id="provider"
          title="Provider Key"
          value={providerKey}
          placeholder="Select a provider key"
          onChange={setProviderKey}
        >
          <Form.Dropdown.Item value="" title="None" />
          <Form.Dropdown.Section>
            {apiKeys.map((key) => (
              <Form.Dropdown.Item key={key} value={key} title={key} />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      )}

      <Form.TextField
        id="context"
        title="Context Window"
        placeholder="128000"
        value={String(context)}
        onChange={(value) => {
          const parsed = parseInt(value, 10);
          setContext(isNaN(parsed) ? 128000 : parsed);
        }}
        error={getContextError(context)}
      />

      <Form.Separator />

      <Form.Checkbox
        id="ability-temperature"
        label="Temperature"
        value={abilities?.temperature?.supported || false}
        onChange={(checked) => updateModelAbility("temperature", checked)}
        info="Enable if the model supports temperature parameter for controlling randomness/creativity of responses"
      />

      <Form.Checkbox
        id="ability-vision"
        label="Vision"
        value={abilities?.vision?.supported || false}
        onChange={(checked) => updateModelAbility("vision", checked)}
        info="Enable if the model can process and understand images (multimodal capabilities)"
      />

      <Form.Checkbox
        id="ability-system_message"
        label="System Message"
        value={abilities?.system_message?.supported || false}
        onChange={(checked) => updateModelAbility("system_message", checked)}
        info="Enable if the model supports system messages for setting behavior and context"
      />

      <Form.Checkbox
        id="ability-tools"
        label="Tools"
        value={abilities?.tools?.supported || false}
        onChange={(checked) => updateModelAbility("tools", checked)}
        info="Enable if the model supports function calling and tool usage (e.g., API calls, code execution)"
      />

      <Form.Checkbox
        id="ability-reasoning_effort"
        label="Reasoning Effort"
        value={abilities?.reasoning_effort?.supported || false}
        onChange={(checked) => updateModelAbility("reasoning_effort", checked)}
        info="Enable if the model supports reasoning effort parameter for controlling depth of thinking"
      />
    </Form>
  );
}
