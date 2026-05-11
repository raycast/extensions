import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { LLMService, Model } from "./utils/llm-service";

const PROVIDERS = [
  { value: "raycast", title: "Raycast AI (Default)" },
  { value: "openai", title: "OpenAI" },
  { value: "anthropic", title: "Anthropic" },
  { value: "gemini", title: "Gemini" },
  { value: "openrouter", title: "OpenRouter" },
];

const PROVIDER_URLS: Record<string, string> = {
  openai: "https://platform.openai.com/docs/models",
  anthropic: "https://docs.anthropic.com/en/docs/models-overview",
  gemini: "https://ai.google.dev/gemini-api/docs/models/gemini",
  openrouter: "https://openrouter.ai/models",
  raycast: "https://raycast.com",
};

const STORAGE_KEYS = {
  provider: "configured_provider",
  apiKey: (p: string) => `api_key_${p}`,
  model: (p: string) => `selected_model_${p}`,
};

export default function ConfigureModelCommand() {
  const [ready, setReady] = useState(false);
  const [provider, setProvider] = useState("raycast");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Load all saved data on mount
  useEffect(() => {
    (async () => {
      const p =
        (await LocalStorage.getItem<string>(STORAGE_KEYS.provider)) ||
        "raycast";
      const key =
        (await LocalStorage.getItem<string>(STORAGE_KEYS.apiKey(p))) || "";
      const model =
        (await LocalStorage.getItem<string>(STORAGE_KEYS.model(p))) || "";

      setProvider(p);
      setApiKey(key);
      setSelectedModel(model);

      if (p !== "raycast" && key) {
        try {
          const fetched = await LLMService.fetchModelsWithKey(p, key);
          setModels(fetched);
        } catch (e) {
          console.error("Failed to fetch models on load", e);
        }
      }

      setIsLoading(false);
      setReady(true);
    })();
  }, []);

  async function onProviderChange(newProvider: string) {
    setProvider(newProvider);
    setModels([]);
    setSelectedModel("");
    setIsLoading(true);

    try {
      const key =
        (await LocalStorage.getItem<string>(
          STORAGE_KEYS.apiKey(newProvider),
        )) || "";
      const model =
        (await LocalStorage.getItem<string>(STORAGE_KEYS.model(newProvider))) ||
        "";
      setApiKey(key);
      setSelectedModel(model);

      if (newProvider !== "raycast" && key) {
        const fetched = await LLMService.fetchModelsWithKey(newProvider, key);
        setModels(fetched);
      }
    } catch (e) {
      console.error("Failed to load provider data", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFetchModels() {
    if (!apiKey && provider !== "raycast") {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Enter an API key first",
      });
      return;
    }
    setIsLoading(true);
    try {
      const fetched = await LLMService.fetchModelsWithKey(provider, apiKey);
      setModels(fetched);
      await showToast({ style: Toast.Style.Success, title: "Models Loaded" });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch models",
        message: String(e),
      });
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(values: {
    provider: string;
    apiKey: string;
    modelId: string;
  }) {
    const p = values.provider;
    const key = values.apiKey?.trim() || "";
    const finalModel = values.modelId;

    await LocalStorage.setItem(STORAGE_KEYS.provider, p);

    if (p !== "raycast") {
      if (key) {
        await LocalStorage.setItem(STORAGE_KEYS.apiKey(p), key);
      }
      if (!finalModel) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Model",
          message: "Please select a model",
        });
        return;
      }
      await LocalStorage.setItem(STORAGE_KEYS.model(p), finalModel);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Configuration Saved",
      message: p === "raycast" ? "Using Raycast AI" : `${p}: ${finalModel}`,
    });
  }

  if (!ready) {
    return <Form isLoading={true} />;
  }

  const showModelFields = provider !== "raycast";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Configuration"
            onSubmit={handleSubmit}
          />
          {showModelFields && (
            <Action
              title="Fetch Models"
              onAction={handleFetchModels}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          {showModelFields && (
            <Action
              title="Open Provider Docs"
              onAction={() => open(PROVIDER_URLS[provider] || "")}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="provider"
        title="AI Provider"
        value={provider}
        onChange={onProviderChange}
      >
        {PROVIDERS.map((p) => (
          <Form.Dropdown.Item key={p.value} value={p.value} title={p.title} />
        ))}
      </Form.Dropdown>

      {provider === "raycast" && (
        <Form.Description text="Raycast AI uses the model configured in Raycast Settings > AI. No additional setup needed here." />
      )}

      {showModelFields && (
        <>
          <Form.Separator />
          <Form.PasswordField
            id="apiKey"
            title="API Key"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={setApiKey}
            info="Your key is stored locally."
          />
          <Form.Separator />
          <Form.Dropdown
            id="modelId"
            title="Select Model"
            value={selectedModel}
            onChange={setSelectedModel}
          >
            {models.length === 0 && !isLoading && (
              <Form.Dropdown.Item value="" title="No models loaded" />
            )}
            {models.map((model) => (
              <Form.Dropdown.Item
                key={model.id}
                value={model.id}
                title={`${model.name} (${model.id})`}
              />
            ))}
          </Form.Dropdown>
          <Form.Description text="Press Cmd+R (or Ctrl+R) to refresh the models list." />
        </>
      )}
    </Form>
  );
}
