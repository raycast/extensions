import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProviderModels } from "../hooks/use-provider-models";
import { getProviderConfigs, saveModelPreset } from "../storage";
import type { ModelPreset, Provider, ProviderConfig } from "../types";
import { isProvider, PROVIDER_LABELS, PROVIDERS } from "../types";

const CUSTOM_MODEL_VALUE = "__custom__";

interface FormValues {
  name: string;
  provider: string;
  model: string;
  customModel: string;
  temperature: string;
  maxTokens: string;
}

interface ModelPresetFormProps {
  preset?: ModelPreset;
  onSave: () => void;
}

export function ModelPresetForm({ preset, onSave }: ModelPresetFormProps) {
  const { pop } = useNavigation();
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(
    preset?.provider ?? "openai",
  );
  const [isCustomModel, setIsCustomModel] = useState(false);

  const { models, isLoading: modelsLoading } =
    useProviderModels(selectedProvider);

  useEffect(() => {
    (async () => {
      const configs = await getProviderConfigs();
      setProviderConfigs(configs);
    })();
  }, []);

  // Switch to custom mode if existing model is not in the list during edit mode
  useEffect(() => {
    if (modelsLoading) return;
    if (preset && models.length > 0) {
      const found = models.some((m) => m.id === preset.model);
      setIsCustomModel(!found);
    } else if (models.length === 0 && !modelsLoading) {
      setIsCustomModel(true);
    }
  }, [models, modelsLoading, preset]);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const modelValue =
        values.model === CUSTOM_MODEL_VALUE ? values.customModel : values.model;
      await saveModelPreset({
        id: preset?.id,
        name: values.name,
        provider: isProvider(values.provider) ? values.provider : "openai",
        model: modelValue,
        temperature: parseFloat(values.temperature),
        maxTokens: values.maxTokens
          ? parseInt(values.maxTokens, 10)
          : undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: preset ? "Preset updated" : "Preset created",
      });
      onSave();
      pop();
    },
    initialValues: {
      name: preset?.name ?? "",
      provider: preset?.provider ?? "openai",
      model: preset?.model ?? "",
      customModel: preset?.model ?? "",
      temperature: String(preset?.temperature ?? 0.7),
      maxTokens: preset?.maxTokens ? String(preset.maxTokens) : "",
    },
    validation: {
      name: FormValidation.Required,
      model: (value) => {
        if (!value) return "Required";
        if (value === CUSTOM_MODEL_VALUE && !isCustomModel) return undefined;
      },
      customModel: (value) => {
        if (isCustomModel && !value) return "Please enter a model name";
      },
      temperature: (value) => {
        const num = parseFloat(value ?? "");
        if (Number.isNaN(num) || num < 0 || num > 2) return "0.0 ~ 2.0 range";
      },
      maxTokens: (value) => {
        if (!value) return;
        const n = parseInt(value, 10);
        if (Number.isNaN(n) || n <= 0) return "Must be positive number";
      },
    },
  });

  const handleProviderChange = useCallback(
    (value: string) => {
      if (isProvider(value)) {
        setSelectedProvider(value);
        setIsCustomModel(false);
      }
      itemProps.provider.onChange?.(value);
    },
    [itemProps.provider.onChange],
  );

  const handleModelChange = useCallback(
    (value: string) => {
      setIsCustomModel(value === CUSTOM_MODEL_VALUE);
      itemProps.model.onChange?.(value);
    },
    [itemProps.model.onChange],
  );

  const enabledProviders = useMemo(
    () =>
      providerConfigs.length > 0
        ? providerConfigs.filter((c) => c.enabled)
        : undefined,
    [providerConfigs],
  );

  return (
    <Form
      navigationTitle={preset ? "Edit Preset" : "Create Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={preset ? "Update" : "Create"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="e.g. Fast, Smart, Local"
        {...itemProps.name}
      />

      <Form.Dropdown
        title="Provider"
        {...itemProps.provider}
        onChange={handleProviderChange}
      >
        {(
          enabledProviders ??
          PROVIDERS.map((p) => ({ provider: p, enabled: true }))
        ).map((config) => (
          <Form.Dropdown.Item
            key={config.provider}
            value={config.provider}
            title={PROVIDER_LABELS[config.provider]}
          />
        ))}
      </Form.Dropdown>

      {modelsLoading ? (
        <Form.Description title="Model" text="Loading models..." />
      ) : models.length > 0 && !isCustomModel ? (
        <Form.Dropdown
          title="Model"
          {...itemProps.model}
          onChange={handleModelChange}
        >
          {models.map((m) => (
            <Form.Dropdown.Item
              key={m.id}
              value={m.id}
              title={m.name !== m.id ? `${m.name} (${m.id})` : m.id}
            />
          ))}
          <Form.Dropdown.Item
            key={CUSTOM_MODEL_VALUE}
            value={CUSTOM_MODEL_VALUE}
            title="Enter manually..."
          />
        </Form.Dropdown>
      ) : (
        <Form.TextField
          title="Model"
          placeholder="e.g. gpt-4o-mini, claude-sonnet-4-20250514"
          {...itemProps.customModel}
        />
      )}

      <Form.TextField
        title="Temperature"
        placeholder="0.0 - 2.0"
        {...itemProps.temperature}
      />
      <Form.TextField
        title="Max Tokens"
        placeholder="Optional"
        {...itemProps.maxTokens}
      />
    </Form>
  );
}
