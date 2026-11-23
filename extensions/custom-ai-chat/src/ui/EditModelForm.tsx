import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { normalizeBaseUrl } from "../config/providers";
import { updateModelInProvidersYaml } from "../config/providers-writer";
import type { ModelRef } from "../types";

export interface ModelLocator {
  providerId: string;
  modelId: string;
}

interface EditModelFormProps {
  model: ModelRef;
  onSaved: (locator: ModelLocator) => void | Promise<void>;
  onDelete: () => Promise<boolean>;
}

export function EditModelForm({ model, onSaved, onDelete }: EditModelFormProps) {
  const { pop } = useNavigation();
  const [baseUrl, setBaseUrl] = useState(model.baseUrl);
  const [apiKey, setApiKey] = useState(model.apiKey ?? "");

  function handleBaseUrlChange(value: string) {
    setBaseUrl(value);
    const changed = normalizeBaseUrl(value) !== normalizeBaseUrl(model.baseUrl);
    if (changed && apiKey) {
      setApiKey("");
      void showToast({
        style: Toast.Style.Animated,
        title: "New address — enter its API Key",
        message: "The current key belongs to the old address.",
      });
    } else if (!changed && !apiKey) {
      setApiKey(model.apiKey ?? "");
    }
  }

  async function handleDelete() {
    const deleted = await onDelete();
    if (deleted) {
      pop();
    }
  }

  async function handleSubmit(values: Form.Values) {
    const nextBaseUrl = baseUrl.trim();
    const apiKeyInput = apiKey.trim();
    const modelId = String(values.modelId ?? "").trim();
    const addressChanged = normalizeBaseUrl(nextBaseUrl) !== normalizeBaseUrl(model.baseUrl);
    const keyUnchanged = !addressChanged && apiKeyInput === (model.apiKey ?? "");
    const effectiveKey = keyUnchanged ? undefined : apiKeyInput || undefined;

    if (addressChanged && !apiKeyInput) {
      await showToast({ style: Toast.Style.Failure, title: "Enter an API Key for the new address" });
      return false;
    }

    try {
      const result = await updateModelInProvidersYaml(
        { baseUrl: nextBaseUrl, apiKey: effectiveKey, modelId, alias: model.apiKeyAlias },
        { providerId: model.providerId, modelId: model.modelId },
      );

      await showToast({ style: Toast.Style.Success, title: "Model updated" });
      await onSaved({ providerId: result.providerId, modelId: result.modelId });
      pop();
      return true;
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update model" });
      return false;
    }
  }

  return (
    <Form
      navigationTitle="Edit Model"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Model" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action
            title="Delete Model"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => void handleDelete()}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="baseUrl"
        title="Base URL"
        value={baseUrl}
        onChange={handleBaseUrlChange}
        placeholder="e.g. https://api.example.com/v1"
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        value={apiKey}
        onChange={setApiKey}
        placeholder={
          baseUrl.trim() === model.baseUrl ? "Leave unchanged to keep the current key" : "e.g. sk-••••••••••••••••"
        }
      />
      <Form.TextField id="modelId" title="Model ID" defaultValue={model.modelId} placeholder="e.g. your-model-id" />
      <Form.Description text="Changing the Base URL clears the key — enter the one for the new address." />
      <Form.Description text="Models with the same Base URL are grouped together." />
      <Form.Description text="Press ⌘⇧↵ or use the Delete Model action below." />
    </Form>
  );
}
