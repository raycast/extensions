import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useMemo, useState } from "react";
import { parseModelIds } from "./model-ids";
import { listModels } from "./openai-client";
import { saveProvider } from "./provider-store";
import type { ProviderProfile } from "./types";
import { normalizeBaseUrl } from "./url";

const PROVIDER_PRESETS = [
  { value: "custom", title: "Custom OpenAI-Compatible", name: "", baseUrl: "" },
  {
    value: "openai",
    title: "OpenAI",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
  },
  {
    value: "gemini",
    title: "Google Gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  {
    value: "deepseek",
    title: "DeepSeek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
  },
  {
    value: "qwen",
    title: "Alibaba Qwen (China)",
    name: "Alibaba Qwen China",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  {
    value: "qwen-international",
    title: "Alibaba Qwen (International)",
    name: "Alibaba Qwen International",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  },
  {
    value: "zhipu",
    title: "Zhipu GLM (General)",
    name: "Zhipu GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
  },
  {
    value: "zhipu-coding",
    title: "Zhipu GLM (Coding Plan)",
    name: "Zhipu GLM Coding",
    baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
  },
  {
    value: "groq",
    title: "Groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
  },
  {
    value: "mistral",
    title: "Mistral AI",
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
  },
  {
    value: "openrouter",
    title: "OpenRouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  {
    value: "together",
    title: "Together AI",
    name: "Together AI",
    baseUrl: "https://api.together.ai/v1",
  },
  {
    value: "siliconflow",
    title: "SiliconFlow",
    name: "SiliconFlow",
    baseUrl: "https://api.siliconflow.com/v1",
  },
  {
    value: "fireworks",
    title: "Fireworks AI",
    name: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
  },
  {
    value: "cerebras",
    title: "Cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
  },
  {
    value: "ollama",
    title: "Ollama (Local)",
    name: "Ollama",
    baseUrl: "http://127.0.0.1:11434/v1",
  },
  {
    value: "lm-studio",
    title: "LM Studio (Local)",
    name: "LM Studio",
    baseUrl: "http://127.0.0.1:1234/v1",
  },
] as const;

type Preset = (typeof PROVIDER_PRESETS)[number]["value"];

function DiscoveredModelsForm(props: {
  models: string[];
  initialSelection: string[];
  onSelect: (models: string[]) => void;
}) {
  const { pop } = useNavigation();
  const [selection, setSelection] = useState(props.initialSelection);

  return (
    <Form
      navigationTitle={`Choose Models — ${props.models.length} Available`}
      actions={
        <ActionPanel>
          <Action
            title="Add Selected Models"
            icon={Icon.Checkmark}
            onAction={() => {
              if (selection.length === 0) return;
              props.onSelect(selection);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="models"
        title="Models"
        placeholder="Search and select models"
        value={selection}
        onChange={setSelection}
      >
        {props.models.map((model) => (
          <Form.TagPicker.Item key={model} value={model} title={model} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export function ProviderForm(props: {
  provider?: ProviderProfile;
  onSaved: (provider: ProviderProfile) => void | Promise<void>;
}) {
  const { pop, push } = useNavigation();
  const existing = props.provider;
  const [preset, setPreset] = useState<Preset>("custom");
  const [name, setName] = useState(existing?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");
  const [modelId, setModelId] = useState(existing?.defaultModelId ?? "");
  const [systemPrompt, setSystemPrompt] = useState(
    existing?.systemPrompt ?? "",
  );
  const [modelIdsText, setModelIdsText] = useState(
    Array.from(
      new Set(
        [existing?.defaultModelId, ...(existing?.models ?? [])].filter(
          (model): model is string => Boolean(model),
        ),
      ),
    ).join("\n"),
  );
  const [lastModelSyncAt, setLastModelSyncAt] = useState(
    existing?.lastModelSyncAt,
  );
  const [isDiscovering, setIsDiscovering] = useState(false);
  const models = useMemo(() => parseModelIds(modelIdsText), [modelIdsText]);
  const effectiveDefaultModel = models.includes(modelId)
    ? modelId
    : (models[0] ?? "");

  const applyPreset = (value: string) => {
    const next = value as Preset;
    setPreset(next);
    const selected = PROVIDER_PRESETS.find((item) => item.value === next);
    if (!selected || selected.value === "custom") return;
    setBaseUrl(selected.baseUrl);
    if (!name.trim()) setName(selected.name);
  };

  const discover = async () => {
    setIsDiscovering(true);
    try {
      const found = await listModels(baseUrl, apiKey);
      if (found.length === 0)
        throw new Error("The endpoint returned an empty model list.");
      const currentModels = parseModelIds(modelIdsText);
      const undiscoveredModels = currentModels.filter(
        (model) => !found.includes(model),
      );
      const initiallySelected = currentModels.filter((model) =>
        found.includes(model),
      );
      if (initiallySelected.length === 0 && found[0]) {
        initiallySelected.push(found[0]);
      }
      await showToast({
        style: Toast.Style.Success,
        title: `Found ${found.length} model${found.length === 1 ? "" : "s"}`,
        message: "Select one or more models to add to this provider.",
      });
      push(
        <DiscoveredModelsForm
          models={found}
          initialSelection={initiallySelected}
          onSelect={(selectedModels) => {
            const configuredModels = Array.from(
              new Set([...undiscoveredModels, ...selectedModels]),
            );
            setModelIdsText(configuredModels.join("\n"));
            if (!configuredModels.includes(modelId)) {
              setModelId(configuredModels[0] ?? "");
            }
            setLastModelSyncAt(new Date().toISOString());
          }}
        />,
        () => undefined,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Model discovery failed",
        message: `${error instanceof Error ? error.message : String(error)} You can enter a model ID manually.`,
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Provider name is required",
      });
      return;
    }
    if (models.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Add at least one model",
      });
      return;
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeBaseUrl(baseUrl);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Base URL",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const now = new Date().toISOString();
    const profile: ProviderProfile = {
      id: existing?.id ?? randomUUID(),
      name: name.trim(),
      baseUrl: normalizedUrl,
      apiKey: apiKey.trim(),
      defaultModelId: effectiveDefaultModel,
      systemPrompt: systemPrompt.trim(),
      models,
      lastModelSyncAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await saveProvider(profile);
    await props.onSaved(profile);
    await showToast({
      style: Toast.Style.Success,
      title: existing ? "Provider updated" : "Provider added",
    });
    pop();
  };

  return (
    <Form
      isLoading={isDiscovering}
      navigationTitle={existing ? "Edit Provider" : "Add Provider"}
      actions={
        <ActionPanel>
          <Action
            title={existing ? "Save Provider" : "Add Provider"}
            icon={Icon.Checkmark}
            onAction={submit}
          />
          <Action
            title="Discover Models"
            icon={Icon.MagnifyingGlass}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={discover}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="preset"
        title="Preset"
        value={preset}
        onChange={applyPreset}
      >
        {PROVIDER_PRESETS.map((item) => (
          <Form.Dropdown.Item
            key={item.value}
            value={item.value}
            title={item.title}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My AI Provider"
        value={name}
        onChange={setName}
      />
      <Form.TextField
        id="baseUrl"
        title="Base URL"
        placeholder="https://api.example.com/v1"
        value={baseUrl}
        onChange={setBaseUrl}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Optional for local endpoints"
        value={apiKey}
        onChange={setApiKey}
      />
      <Form.TextArea
        id="modelIds"
        title="Models"
        placeholder={"One model ID per line\nglm-5.3\nglm-4.7-flash"}
        info="Enter one model ID per line or separate IDs with commas. Discover Models lets you select multiple models from the endpoint."
        value={modelIdsText}
        onChange={setModelIdsText}
      />
      {models.length > 0 ? (
        <Form.Dropdown
          id="modelId"
          title="Default Model"
          value={effectiveDefaultModel}
          onChange={setModelId}
        >
          {models.map((model) => (
            <Form.Dropdown.Item key={model} value={model} title={model} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextArea
        id="systemPrompt"
        title="System Prompt"
        placeholder="Optional instructions applied to new chats"
        value={systemPrompt}
        onChange={setSystemPrompt}
      />
      {models.length > 0 ? (
        <Form.Description
          title="Configured Models"
          text={`${models.length} model${models.length === 1 ? "" : "s"} available in chat. Use Discover Models to select more.`}
        />
      ) : null}
    </Form>
  );
}
