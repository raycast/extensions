/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type AIModelOption, resolveAIProviderModelCatalog } from "@/ai-providers/modelCatalog";
import {
  getOpenAICompatiblePresetSelection,
  OPENAI_COMPATIBLE_PRESETS,
  type OpenAICompatiblePresetName,
} from "@/ai-providers/presets";
import { getAIProviderProfileValidationError, normalizeAIProviderProfile } from "@/ai-providers/profile";
import { isAIProviderProfileRunnable } from "@/ai-providers/runtime";
import { getAIProviderTestFingerprint } from "@/ai-providers/testFingerprint";
import type {
  AIProviderProfile,
  JSONOutputMode,
  LegacyAIProviderName,
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

export interface LegacyReplacementOption {
  value: LegacyAIProviderName;
  title: string;
}

export function AIProviderForm({
  profile,
  onSave,
  isNewProvider = false,
  showPresetSelector = false,
  legacyReplacement,
  legacyReplacementOptions = [],
}: {
  profile: AIProviderProfile;
  onSave: (profile: AIProviderProfile, legacyReplacement?: LegacyAIProviderName) => Promise<void>;
  isNewProvider?: boolean;
  showPresetSelector?: boolean;
  legacyReplacement?: LegacyAIProviderName;
  legacyReplacementOptions?: LegacyReplacementOption[];
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
  const [selectedLegacyReplacement, setSelectedLegacyReplacement] = useState<LegacyAIProviderName | "">(
    legacyReplacement ?? "",
  );
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
  const [lastTestedFingerprint, setLastTestedFingerprint] = useState<string | undefined>(() =>
    isNewProvider ? undefined : getAIProviderTestFingerprint(profile),
  );

  function selectPreset(nextPresetName: OpenAICompatiblePresetName) {
    const preset = getOpenAICompatiblePresetSelection(nextPresetName);
    setPresetName(nextPresetName);
    setName(preset.name);
    setEndpoint(preset.endpoint);
    setWebsite(preset.website);
    setModel(preset.model);
    setAPIKey(preset.apiKey);
    setTokenLimitMode(preset.tokenLimitMode);
    setJSONOutputMode(preset.jsonOutputMode);
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

  async function submit(testBeforeSaving: boolean) {
    let saved = buildDraftProfile();
    if (testBeforeSaving) {
      const tested = await testProvider(saved);
      if (!tested) return;
      saved = tested;
    } else if (!(await ensureProviderRunnable(saved))) {
      return;
    }

    await onSave(saved, selectedLegacyReplacement || undefined);
    pop();
  }

  async function testProvider(draft = buildDraftProfile()): Promise<AIProviderProfile | undefined> {
    if (!(await ensureProviderRunnable(draft))) return undefined;

    testAbortController.current?.abort();
    const abortController = new AbortController();
    testAbortController.current = abortController;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Testing ${draft.name || "AI provider"}...`,
    });

    let testedDraft = draft;
    try {
      let translation: string;
      if (draft.wordResultMode === "dictionary") {
        const result = await createAIDictionaryProvider(draft, (fallbackProfile) => {
          testedDraft = fallbackProfile;
          setJSONOutputMode("prompt");
        }).request(
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

      setLastTestedFingerprint(getAIProviderTestFingerprint(testedDraft));
      const usedPromptFallback = testedDraft !== draft;
      toast.style = Toast.Style.Success;
      toast.title = usedPromptFallback ? "Provider test succeeded with fallback" : "Provider test succeeded";
      toast.message = usedPromptFallback
        ? "Native JSON is unsupported. Switched this draft to Prompt-Based JSON."
        : `Hello → ${translation}`;
      return testedDraft;
    } catch (error) {
      if (abortController.signal.aborted) return undefined;
      toast.style = Toast.Style.Failure;
      toast.title = "Provider test failed";
      toast.message = normalizeError(error).message;
      return undefined;
    } finally {
      if (testAbortController.current === abortController) {
        testAbortController.current = null;
      }
    }
  }

  async function ensureProviderRunnable(draft: AIProviderProfile): Promise<boolean> {
    if (isAIProviderProfileRunnable(draft)) return true;
    await showToast({
      style: Toast.Style.Failure,
      title: "Provider configuration is incomplete",
      message: getAIProviderProfileValidationError(draft) ?? "Choose an available Raycast AI model.",
    });
    return false;
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
  const draftNeedsTesting = lastTestedFingerprint !== getAIProviderTestFingerprint(buildDraftProfile());

  return (
    <Form
      navigationTitle={profile.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={draftNeedsTesting ? "Test & Save Provider" : "Save Provider"}
            icon={draftNeedsTesting ? Icon.Bolt : Icon.SaveDocument}
            onSubmit={() => submit(draftNeedsTesting)}
          />
          {draftNeedsTesting && (
            <Action.SubmitForm title="Save Without Testing" icon={Icon.SaveDocument} onSubmit={() => submit(false)} />
          )}
          <Action
            title="Test Provider"
            icon={Icon.Bolt}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "t" },
              Windows: { modifiers: ["ctrl"], key: "t" },
            }}
            onAction={() => void testProvider()}
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
      {(legacyReplacement !== undefined || legacyReplacementOptions.length > 0) && (
        <Form.Dropdown
          id="legacyReplacement"
          title="Replace Legacy Provider"
          value={selectedLegacyReplacement}
          onChange={(value) => setSelectedLegacyReplacement(value as LegacyAIProviderName | "")}
        >
          <Form.Dropdown.Item title="None" value="" />
          {legacyReplacementOptions.map((option) => (
            <Form.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </Form.Dropdown>
      )}
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
          text="Some models may fail to return valid structured dictionary output and require a retry. Easydict uses a compatible fallback when possible. Dictionary generation may also take longer."
        />
      )}
      {profile.adapter === "openai-compatible" && wordResultMode === "dictionary" && (
        <Form.Dropdown
          id="jsonOutputMode"
          title="JSON Output"
          value={jsonOutputMode}
          onChange={(value) => setJSONOutputMode(value as JSONOutputMode)}
        >
          <Form.Dropdown.Item title="Native JSON Object (If Supported)" value="json-object" />
          <Form.Dropdown.Item title="Prompt-Based JSON (Compatible)" value="prompt" />
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
