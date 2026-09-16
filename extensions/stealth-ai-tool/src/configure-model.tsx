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
import {
  LLMService,
  Model,
  PROVIDERS,
  STORAGE_KEYS,
  defaultBaseUrl,
  getProviderInfo,
  isLocalProvider,
  requiresApiKey,
} from "./utils/llm-service";

export default function ConfigureModelCommand() {
  const [ready, setReady] = useState(false);
  const [provider, setProvider] = useState("raycast");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const p =
        (await LocalStorage.getItem<string>(STORAGE_KEYS.provider)) ||
        "raycast";
      await loadProvider(p);
      setReady(true);
    })();
  }, []);

  /** Pull the stored settings for a provider and, when possible, its model list. */
  async function loadProvider(p: string) {
    setProvider(p);
    setModels([]);
    setSelectedModel("");
    setIsLoading(true);

    try {
      const key =
        (await LocalStorage.getItem<string>(STORAGE_KEYS.apiKey(p))) || "";
      const model =
        (await LocalStorage.getItem<string>(STORAGE_KEYS.model(p))) || "";
      const url =
        (await LocalStorage.getItem<string>(STORAGE_KEYS.baseUrl(p))) ||
        defaultBaseUrl(p);

      setApiKey(key);
      setBaseUrl(url);
      setSelectedModel(model);

      // Local providers need no key, so their list can be loaded straight away.
      if (p !== "raycast" && (key || isLocalProvider(p))) {
        setModels(await LLMService.fetchModelsWithKey(p, key, url));
      }
    } catch (e) {
      console.error(`Failed to load models for ${p}`, e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFetchModels() {
    if (requiresApiKey(provider) && !apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Enter an API key first",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fetched = await LLMService.fetchModelsWithKey(
        provider,
        apiKey,
        baseUrl,
      );
      setModels(fetched);
      if (fetched.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No models found",
          message: isLocalProvider(provider)
            ? "The server is reachable but has no models available"
            : "Provider returned an empty list",
        });
        return;
      }
      await showToast({
        style: Toast.Style.Success,
        title: `Loaded ${fetched.length} model${fetched.length === 1 ? "" : "s"}`,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch models",
        message: (e as Error).message,
      });
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Validate before persisting anything: switching the active provider on a
  // rejected form would leave every action pointing at an unusable config.
  async function handleSubmit(values: { modelId: string }) {
    const finalModel = values.modelId;

    if (provider === "raycast") {
      await LocalStorage.setItem(STORAGE_KEYS.provider, provider);
      await showToast({
        style: Toast.Style.Success,
        title: "Configuration Saved",
        message: "Using Raycast AI",
      });
      return;
    }

    const key = apiKey.trim();
    if (requiresApiKey(provider) && !key) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: `${provider} needs an API key`,
      });
      return;
    }
    if (!finalModel) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Model",
        message: "Fetch models (Cmd+R) and select one",
      });
      return;
    }

    await LocalStorage.setItem(STORAGE_KEYS.apiKey(provider), key);
    if (isLocalProvider(provider)) {
      await LocalStorage.setItem(
        STORAGE_KEYS.baseUrl(provider),
        baseUrl.trim(),
      );
    }
    await LocalStorage.setItem(STORAGE_KEYS.model(provider), finalModel);
    // Switch the active provider only once its config is complete.
    await LocalStorage.setItem(STORAGE_KEYS.provider, provider);

    await showToast({
      style: Toast.Style.Success,
      title: "Configuration Saved",
      message: `${provider}: ${finalModel}`,
    });
  }

  if (!ready) return <Form isLoading={true} />;

  const info = getProviderInfo(provider);
  const showModelFields = provider !== "raycast";
  const local = isLocalProvider(provider);
  // Guard against a stored model that is no longer in the fetched list, which
  // would leave the dropdown with a value it cannot render.
  const dropdownValue = models.some((m) => m.id === selectedModel)
    ? selectedModel
    : "";

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
              title={local ? "Connect and Fetch Models" : "Fetch Models"}
              onAction={handleFetchModels}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          {showModelFields && (
            <Action
              title="Open Provider Docs"
              onAction={() => open(info?.docsUrl || "")}
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
        onChange={loadProvider}
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

          {local && (
            <Form.TextField
              id="baseUrl"
              title="Server URL"
              placeholder={defaultBaseUrl(provider)}
              value={baseUrl}
              onChange={setBaseUrl}
              info="Base address of your local server. A trailing /v1 or /api is optional."
            />
          )}

          <Form.PasswordField
            id="apiKey"
            title={local ? "API Key (optional)" : "API Key"}
            placeholder={
              local ? "Only if your server requires auth" : "Enter your API key"
            }
            value={apiKey}
            onChange={setApiKey}
            info="Stored locally on this machine."
          />

          <Form.Separator />

          <Form.Dropdown
            id="modelId"
            title="Select Model"
            value={dropdownValue}
            onChange={setSelectedModel}
          >
            <Form.Dropdown.Item
              value=""
              title={
                models.length === 0 ? "No models loaded" : "Select a model…"
              }
            />
            {models.map((model) => (
              <Form.Dropdown.Item
                key={model.id}
                value={model.id}
                title={
                  model.description
                    ? `${model.name} — ${model.description}`
                    : model.name
                }
              />
            ))}
          </Form.Dropdown>

          <Form.Description
            text={
              info?.hint
                ? `${info.hint}\nPress Cmd+R to refresh the model list.`
                : "Press Cmd+R (or Ctrl+R) to refresh the models list."
            }
          />
        </>
      )}
    </Form>
  );
}
