import {
  Form,
  ActionPanel,
  Action,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { DEFAULT_URLS, PROVIDER_NAMES, fetchModels } from "./lib/api";
import type { ProviderType, ProviderConfig } from "./lib/types";
import {
  setProviderUrl,
  getProviderUrl,
  markOnboardingComplete,
} from "./lib/onboarding";

const PROVIDERS: ProviderType[] = ["ollama", "lmstudio", "llamacpp", "custom"];

export function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const { pop } = useNavigation();
  const [provider, setProvider] = useState<ProviderType>("ollama");
  const [ollamaUrl, setOllamaUrl] = useState(DEFAULT_URLS.ollama);
  const [lmstudioUrl, setLmstudioUrl] = useState(DEFAULT_URLS.lmstudio);
  const [llamacppUrl, setLlamacppUrl] = useState(DEFAULT_URLS.llamacpp);
  const [customUrl, setCustomUrl] = useState("");

  // Load previously saved per-provider URLs
  useEffect(() => {
    (async () => {
      const saved = {
        ollama: await getProviderUrl("ollama"),
        lmstudio: await getProviderUrl("lmstudio"),
        llamacpp: await getProviderUrl("llamacpp"),
        custom: await getProviderUrl("custom"),
      };
      if (saved.ollama) setOllamaUrl(saved.ollama);
      if (saved.lmstudio) setLmstudioUrl(saved.lmstudio);
      if (saved.llamacpp) setLlamacppUrl(saved.llamacpp);
      if (saved.custom) setCustomUrl(saved.custom);
    })();
  }, []);

  const urlForProvider = (p: ProviderType): string => {
    switch (p) {
      case "ollama":
        return ollamaUrl;
      case "lmstudio":
        return lmstudioUrl;
      case "llamacpp":
        return llamacppUrl;
      case "custom":
        return customUrl;
    }
  };

  const handleTestConnection = async () => {
    const url = urlForProvider(provider).trim();
    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "URL Required",
        message: "Please enter a server URL",
      });
      return;
    }

    const testConfig: ProviderConfig = {
      type: provider,
      baseUrl: url,
      defaultModel: "",
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: "",
      streamResponses: true,
    };

    try {
      const models = await fetchModels(testConfig);
      await showToast({
        style: Toast.Style.Success,
        title: "Connected!",
        message: `Found ${models.length} model${models.length !== 1 ? "s" : ""} on ${PROVIDER_NAMES[provider]}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: msg,
      });
    }
  };

  const handleSubmit = async () => {
    for (const p of PROVIDERS) {
      const url = urlForProvider(p).trim();
      if (url && url !== DEFAULT_URLS[p]) {
        await setProviderUrl(p, url);
      }
    }

    const selectedUrl = urlForProvider(provider).trim();
    if (selectedUrl) {
      await setProviderUrl(provider, selectedUrl);
    }

    await markOnboardingComplete();
    await showToast({
      style: Toast.Style.Success,
      title: "Settings Saved",
    });
    onComplete();
    try {
      pop();
    } catch {
      // pop fails if this is the root view (first-time onboarding) — that's fine
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Configuration"
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
          />
          <Action
            title="Test Connection"
            icon={Icon.Wifi}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={handleTestConnection}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Configure Local AI"
        text="Set up your local AI provider endpoints. Press ⌘T to test the selected provider's connection."
      />

      <Form.Separator />

      <Form.Dropdown
        id="provider"
        title="Primary Provider"
        info="Which local AI server do you mainly use?"
        value={provider}
        onChange={(val) => setProvider(val as ProviderType)}
      >
        <Form.Dropdown.Item value="ollama" title="Ollama" icon={Icon.Globe} />
        <Form.Dropdown.Item
          value="lmstudio"
          title="LM Studio"
          icon={Icon.Globe}
        />
        <Form.Dropdown.Item
          value="llamacpp"
          title="llama.cpp"
          icon={Icon.Globe}
        />
        <Form.Dropdown.Item value="custom" title="Custom" icon={Icon.Globe} />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        title="Server URLs"
        text="Set the endpoint URL for each provider you use. Defaults are pre-filled."
      />

      <Form.TextField
        id="ollamaUrl"
        title="Ollama URL"
        placeholder={DEFAULT_URLS.ollama}
        value={ollamaUrl}
        onChange={setOllamaUrl}
        info="Default: http://localhost:11434 — Start with: ollama serve"
      />
      <Form.TextField
        id="lmstudioUrl"
        title="LM Studio URL"
        placeholder={DEFAULT_URLS.lmstudio}
        value={lmstudioUrl}
        onChange={setLmstudioUrl}
        info="Default: http://localhost:1234 — Start server from within the app"
      />
      <Form.TextField
        id="llamacppUrl"
        title="llama.cpp URL"
        placeholder={DEFAULT_URLS.llamacpp}
        value={llamacppUrl}
        onChange={setLlamacppUrl}
        info="Default: http://localhost:8080 — Start with: llama-server -m model.gguf"
      />
      <Form.TextField
        id="customUrl"
        title="Custom Server URL"
        placeholder="http://localhost:8000"
        value={customUrl}
        onChange={setCustomUrl}
        info="Any OpenAI-compatible API endpoint"
      />

      <Form.Separator />

      <Form.Description
        title="Vision Models"
        text='The "Send Screen to AI Chat" and "Send Screen Area to AI Chat" commands require a model that supports image/vision input. If you plan to use these features, install a vision model such as Qwen3-VL-4B (recommended) — e.g. "ollama pull qwen3-vl:4b".'
      />
    </Form>
  );
}
