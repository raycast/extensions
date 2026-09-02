/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type AIModelOption, resolveAIProviderModelCatalog } from "@/ai-providers/modelCatalog";
import { OPENAI_COMPATIBLE_PRESETS, type OpenAICompatiblePresetName } from "@/ai-providers/presets";
import { getAIProviderProfileValidationError, normalizeAIProviderProfile } from "@/ai-providers/profile";
import { isAIProviderProfileRunnable } from "@/ai-providers/runtime";
import type {
  AIProviderProfile,
  JSONOutputMode,
  ProviderIconConfig,
  TokenLimitMode,
  WordResultMode,
} from "@/ai-providers/types";
import { createAIDictionaryProvider } from "@/providers/dictionary/ai";
import { createAITranslationProvider } from "@/providers/translation/ai";
import { normalizeError } from "@/utils/errors";
import { logTrace, logWarn } from "@/utils/logger";

type IconSelection =
  Exclude<ProviderIconConfig["kind"], "preset"> | Extract<ProviderIconConfig, { kind: "preset" }>["name"];

export function AIProviderForm({
  profile,
  onSave,
  showPresetSelector = false,
}: {
  profile: AIProviderProfile;
  onSave: (profile: AIProviderProfile) => Promise<void>;
  showPresetSelector?: boolean;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(profile.name);
  const [model, setModel] = useState(profile.model);
  const [endpoint, setEndpoint] = useState(profile.adapter === "openai-compatible" ? profile.endpoint : "");
  const [website, setWebsite] = useState(profile.adapter === "openai-compatible" ? (profile.website ?? "") : "");
  const [apiKey, setAPIKey] = useState(profile.adapter === "openai-compatible" ? profile.apiKey : "");
  const [tokenLimitMode, setTokenLimitMode] = useState<TokenLimitMode>(
    profile.adapter === "openai-compatible" ? profile.tokenLimitMode : "max-tokens",
  );
  const [jsonOutputMode, setJSONOutputMode] = useState<JSONOutputMode>(
    profile.adapter === "openai-compatible" ? profile.jsonOutputMode : "prompt",
  );
  const [wordResultMode, setWordResultMode] = useState<WordResultMode>(profile.wordResultMode);
  const [iconSelection, setIconSelection] = useState<IconSelection>(
    profile.icon.kind === "preset" ? profile.icon.name : profile.icon.kind,
  );
  const [iconURL, setIconURL] = useState(profile.icon.kind === "remote" ? profile.icon.url : "");
  const [presetName, setPresetName] = useState<OpenAICompatiblePresetName>("custom");
  const [modelSearchText, setModelSearchText] = useState("");
  const modelCatalog = useMemo(
    () =>
      resolveAIProviderModelCatalog(
        profile.adapter === "openai-compatible" ? { ...profile, endpoint, apiKey } : profile,
      ),
    [apiKey, endpoint, profile],
  );
  const [availableModels, setAvailableModels] = useState<AIModelOption[]>(() => modelCatalog.getCachedOptions());
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const testAbortController = useRef<AbortController | null>(null);
  const modelAbortController = useRef<AbortController | null>(null);
  const loadedModelsKey = useRef<string | null>(null);
  const loadingModelsKey = useRef<string | null>(null);

  function selectPreset(nextPresetName: OpenAICompatiblePresetName) {
    const preset = OPENAI_COMPATIBLE_PRESETS[nextPresetName];
    setPresetName(nextPresetName);
    setName(preset.name);
    setEndpoint(preset.endpoint);
    setWebsite("website" in preset ? preset.website : "");
    setModel(preset.model);
    setTokenLimitMode(preset.tokenLimitMode);
    setIconSelection(preset.icon.kind === "preset" ? preset.icon.name : preset.icon.kind);
  }

  function buildDraftProfile(): AIProviderProfile {
    const icon = getIconConfig(iconSelection, iconURL, website);

    return normalizeAIProviderProfile(
      profile.adapter === "raycast-ai"
        ? { ...profile, name, model, icon, wordResultMode }
        : {
            ...profile,
            name,
            endpoint,
            website,
            model,
            apiKey,
            tokenLimitMode,
            jsonOutputMode,
            icon,
            wordResultMode,
          },
    );
  }

  async function submit() {
    const saved = buildDraftProfile();
    if (!isAIProviderProfileRunnable(saved)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Provider configuration is incomplete",
        message: getAIProviderProfileValidationError(saved) ?? "Choose an available Raycast AI model.",
      });
      return;
    }

    await onSave(saved);
    pop();
  }

  async function testProvider() {
    const draft = buildDraftProfile();
    if (!isAIProviderProfileRunnable(draft)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Provider configuration is incomplete",
        message: getAIProviderProfileValidationError(draft) ?? "Choose an available Raycast AI model.",
      });
      return;
    }

    testAbortController.current?.abort();
    const abortController = new AbortController();
    testAbortController.current = abortController;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Testing ${draft.name || "AI provider"}...`,
    });

    try {
      let translation: string;
      if (draft.wordResultMode === "dictionary") {
        const result = await createAIDictionaryProvider(draft).request(
          { word: "Hello", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true },
          { signal: abortController.signal },
        );
        translation = result.result?.translation.trim() ?? "";
      } else {
        const iterator = createAITranslationProvider(draft).request(
          { word: "Hello", fromLanguage: "en", toLanguage: "zh-CHS" },
          { signal: abortController.signal },
        );
        translation = "";
        while (true) {
          const next = await iterator.next();
          if (next.done) {
            translation = next.value.translations[0]?.trim() ?? "";
            break;
          }
        }
      }
      if (!translation) throw new Error("The provider returned an empty translation.");

      toast.style = Toast.Style.Success;
      toast.title = "Provider test succeeded";
      toast.message = `Hello → ${translation}`;
    } catch (error) {
      if (abortController.signal.aborted) return;
      toast.style = Toast.Style.Failure;
      toast.title = "Provider test failed";
      toast.message = normalizeError(error).message;
    } finally {
      if (testAbortController.current === abortController) {
        testAbortController.current = null;
      }
    }
  }

  const loadModels = useCallback(async () => {
    logTrace("AI Models", `load requested for profile: ${profile.name}`);
    const requestKey = modelCatalog.loadKey;
    if (!requestKey) {
      logTrace("AI Models", `load skipped for ${profile.name}: model catalog is not ready`);
      return;
    }

    if (loadedModelsKey.current === requestKey) {
      logTrace("AI Models", `load skipped for ${profile.name}: current configuration already loaded`);
      return;
    }
    if (loadingModelsKey.current === requestKey) {
      logTrace("AI Models", `load skipped for ${profile.name}: request already in progress`);
      return;
    }

    modelAbortController.current?.abort();
    const abortController = new AbortController();
    modelAbortController.current = abortController;
    loadingModelsKey.current = requestKey;
    const cachedModels = modelCatalog.getCachedOptions();
    if (cachedModels.length > 0) {
      setAvailableModels(cachedModels);
    }
    setIsLoadingModels(true);
    try {
      const models = await modelCatalog.loadOptions(abortController.signal);
      if (abortController.signal.aborted) {
        logTrace("AI Models", `discard fetched models for ${profile.name}: request cancelled`);
        return;
      }
      setAvailableModels(models);
      loadedModelsKey.current = requestKey;
    } catch (error) {
      if (abortController.signal.aborted) {
        logTrace("AI Models", `load cancelled for profile: ${profile.name}`);
        return;
      }
      const normalizedError = normalizeError(error);
      logWarn(
        "AI Models",
        `load failed for ${profile.name}, error type: ${error instanceof Error ? error.name : typeof error}`,
      );
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to fetch models",
        message: normalizedError.message,
      });
    } finally {
      if (modelAbortController.current === abortController) {
        modelAbortController.current = null;
        loadingModelsKey.current = null;
        setIsLoadingModels(false);
      }
    }
  }, [modelCatalog, profile.name]);

  useEffect(
    () => () => {
      testAbortController.current?.abort();
      modelAbortController.current?.abort();
    },
    [],
  );

  useEffect(() => {
    modelAbortController.current?.abort();
    modelAbortController.current = null;
    loadedModelsKey.current = null;
    loadingModelsKey.current = null;
    setAvailableModels(modelCatalog.getCachedOptions());
    setModelSearchText("");
    setIsLoadingModels(false);
  }, [modelCatalog]);

  useEffect(() => {
    if (!modelCatalog.loadKey) return;
    const timer = setTimeout(() => void loadModels(), 300);
    return () => clearTimeout(timer);
  }, [loadModels, modelCatalog.loadKey]);

  const customModel = modelSearchText.trim();
  const modelOptions = mergeModelOptions(model, availableModels, modelCatalog.allowsCustomModel);

  return (
    <Form
      navigationTitle={profile.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Provider" icon={Icon.SaveDocument} onSubmit={submit} />
          <Action
            title="Test Provider"
            icon={Icon.Bolt}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "t" },
              Windows: { modifiers: ["ctrl"], key: "t" },
            }}
            onAction={testProvider}
          />
        </ActionPanel>
      }
    >
      {profile.adapter === "openai-compatible" && showPresetSelector && (
        <Form.Dropdown
          id="preset"
          title="Preset"
          value={presetName}
          onChange={(value) => selectPreset(value as OpenAICompatiblePresetName)}
        >
          {Object.entries(OPENAI_COMPATIBLE_PRESETS).map(([value, preset]) => (
            <Form.Dropdown.Item key={value} title={value === "custom" ? "Custom" : preset.name} value={value} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      {profile.adapter === "openai-compatible" && (
        <>
          <Form.TextField id="endpoint" title="API Base URL" value={endpoint} onChange={setEndpoint} />
          <Form.TextField id="website" title="Website (Optional)" value={website} onChange={setWebsite} />
          <Form.PasswordField id="apiKey" title="API Key" value={apiKey} onChange={setAPIKey} />
          <Form.Description
            title="Model Discovery"
            text="Models load automatically when available; some providers require an API key. You can also enter a model name manually."
          />
        </>
      )}
      <Form.Dropdown
        id="model"
        title="Model"
        value={model}
        placeholder={modelCatalog.allowsCustomModel ? "Type or search models..." : "Search models..."}
        isLoading={isLoadingModels}
        onFocus={() => void loadModels()}
        onSearchTextChange={setModelSearchText}
        onChange={(value) => {
          setModel(value);
          setModelSearchText("");
        }}
      >
        {!model && modelCatalog.allowsCustomModel && <Form.Dropdown.Item value="" title="Type a Model Name" />}
        {modelCatalog.allowsCustomModel &&
          customModel &&
          !modelOptions.some((option) => option.value === customModel) && (
            <Form.Dropdown.Section title="Custom">
              <Form.Dropdown.Item value={customModel} title={`Use “${customModel}”`} />
            </Form.Dropdown.Section>
          )}
        <Form.Dropdown.Section title="Models">
          {modelOptions.map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {profile.adapter === "openai-compatible" && (
        <Form.Dropdown
          id="tokenLimitMode"
          title="Token Parameter"
          value={tokenLimitMode}
          onChange={(value) => setTokenLimitMode(value as TokenLimitMode)}
        >
          <Form.Dropdown.Item title="max_tokens" value="max-tokens" />
          <Form.Dropdown.Item title="max_completion_tokens" value="max-completion-tokens" />
        </Form.Dropdown>
      )}
      <Form.Dropdown
        id="wordResultMode"
        title="Word & Term Results"
        value={wordResultMode}
        onChange={(value) => setWordResultMode(value as WordResultMode)}
      >
        <Form.Dropdown.Item title="Plain Translation" value="translation" />
        <Form.Dropdown.Item title="AI-Generated Dictionary Entry" value="dictionary" />
      </Form.Dropdown>
      {wordResultMode === "dictionary" && (
        <Form.Description
          title="Compatibility"
          text="Some models may return invalid structured output, causing errors or retries. Dictionary generation may also take longer."
        />
      )}
      {profile.adapter === "openai-compatible" && wordResultMode === "dictionary" && (
        <Form.Dropdown
          id="jsonOutputMode"
          title="JSON Output"
          value={jsonOutputMode}
          onChange={(value) => setJSONOutputMode(value as JSONOutputMode)}
        >
          <Form.Dropdown.Item title="Prompt-Based JSON (Compatible)" value="prompt" />
          <Form.Dropdown.Item title="Native JSON Object (If Supported)" value="json-object" />
        </Form.Dropdown>
      )}
      <Form.Dropdown
        id="icon"
        title="Icon"
        value={iconSelection}
        onChange={(value) => setIconSelection(value as IconSelection)}
      >
        <Form.Dropdown.Item title="OpenAI" value="openai" />
        <Form.Dropdown.Item title="Gemini" value="gemini" />
        <Form.Dropdown.Item title="DeepSeek" value="deepseek" />
        <Form.Dropdown.Item title="OpenRouter" value="openrouter" />
        <Form.Dropdown.Item title="SiliconFlow" value="siliconflow" />
        <Form.Dropdown.Item title="Zhipu GLM" value="zhipu" />
        <Form.Dropdown.Item title="Kimi" value="kimi" />
        <Form.Dropdown.Item title="MiniMax" value="minimax" />
        <Form.Dropdown.Item title="Xiaomi MiMo" value="mimo" />
        <Form.Dropdown.Item title="Raycast" value="raycast" />
        <Form.Dropdown.Item title="Website Favicon" value="favicon" />
        <Form.Dropdown.Item title="Remote HTTPS Image" value="remote" />
        <Form.Dropdown.Item title="Initials" value="initials" />
      </Form.Dropdown>
      {iconSelection === "remote" && (
        <Form.TextField id="iconURL" title="Icon URL" value={iconURL} onChange={setIconURL} />
      )}
    </Form>
  );
}

function getIconConfig(selection: IconSelection, iconURL: string, website: string): ProviderIconConfig {
  switch (selection) {
    case "openai":
    case "gemini":
    case "deepseek":
    case "openrouter":
    case "siliconflow":
    case "zhipu":
    case "kimi":
    case "minimax":
    case "mimo":
    case "raycast":
      return { kind: "preset", name: selection };
    case "favicon":
      return { kind: "favicon", website: website.trim() || undefined };
    case "remote":
      return { kind: "remote", url: iconURL.trim() };
    case "initials":
      return { kind: "initials" };
  }
}

function mergeModelOptions(
  model: string,
  availableModels: AIModelOption[],
  allowsCustomModel: boolean,
): AIModelOption[] {
  const currentModel = model.trim();
  const options = currentModel
    ? [
        {
          title: allowsCustomModel ? currentModel : `Unavailable: ${currentModel}`,
          value: currentModel,
        },
        ...availableModels,
      ]
    : availableModels;
  return [...new Map(options.map((option) => [option.value, option])).values()];
}
