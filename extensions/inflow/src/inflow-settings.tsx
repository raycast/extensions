import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  LocalStorage,
  useNavigation,
  environment,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useRef, useEffect } from "react";
import { getStoredSettings, saveStoredSettings, StoredSettings } from "./core/settings";
import { getOnboardingCompleted, setOnboardingCompleted } from "./core/storage";
import { callCustomProvider, fetchProviderModels, AIModel } from "./core/providers";
import {
  DEFAULT_PROVIDER_ID,
  getProviderModelPlaceholder,
  getProviderDefinition,
  isProviderId,
  PROVIDER_REGISTRY,
  ProviderId,
} from "./core/providerRegistry";
import {
  DEFAULT_LANGUAGE,
  SYSTEM_LANGUAGES,
  getLanguageDisplayLabel,
  normalizeStoredLanguageValue,
} from "./core/languages";
import { getViewCommandConfig, getCommandIcon } from "./commandManifest";
import { WelcomeStep, UsageStep, FinishStep } from "./components/Onboarding";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SettingsCommand() {
  const [step, setStep] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const storedRef = useRef<StoredSettings | null>(null);
  const { pop } = useNavigation();

  const [provider, setProvider] = useState<ProviderId>(DEFAULT_PROVIDER_ID);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [personalContext, setPersonalContext] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState(DEFAULT_LANGUAGE);
  const [expressionLanguage, setExpressionLanguage] = useState(DEFAULT_LANGUAGE);
  const [editableTextHandling, setEditableTextHandling] = useState<string>("panel");
  const [fetchedModels, setFetchedModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelSelectionMode, setModelSelectionMode] = useState<"preset" | "custom">("preset");

  useEffect(() => {
    async function loadSettings() {
      const completed = await getOnboardingCompleted();
      setHasCompletedOnboarding(completed);

      // If completed, skip welcome and go straight to settings (step 3)
      setStep(completed ? 3 : 1);

      const settings = await getStoredSettings();
      storedRef.current = settings;

      const activeProvider = isProviderId(settings.aiProvider) ? settings.aiProvider : DEFAULT_PROVIDER_ID;
      const activeConfig = settings.providers[activeProvider] || {};
      setProvider(activeProvider);
      setApiKey(activeConfig.apiKey || "");
      setModel(activeConfig.aiModel || "");
      setApiUrl(activeConfig.apiEndpoint || "");
      setModelSelectionMode(activeConfig.modelSelectionMode === "custom" ? "custom" : "preset");
      setCustomInstructions(settings.customInstructions || "");
      setPersonalContext(settings.personalContext || "");
      setDefaultLanguage(
        normalizeStoredLanguageValue(settings.defaultLanguage || DEFAULT_LANGUAGE) || DEFAULT_LANGUAGE,
      );
      setExpressionLanguage(normalizeStoredLanguageValue(settings.expressionLanguage || DEFAULT_LANGUAGE));
      setEditableTextHandling(settings.editableTextHandling || "panel");
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const debouncedApiKey = useDebounce(apiKey, 800);
  const debouncedApiUrl = useDebounce(apiUrl, 800);

  const syncCurrentProviderData = () => {
    if (storedRef.current && provider !== DEFAULT_PROVIDER_ID) {
      storedRef.current.providers[provider] = {
        apiKey,
        aiModel: model,
        apiEndpoint: apiUrl,
        modelSelectionMode,
      };
    }
  };

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    if (provider === DEFAULT_PROVIDER_ID) {
      setFetchedModels([]);
      return;
    }

    async function loadModels() {
      if (!debouncedApiKey && provider !== "custom") {
        if (isMounted) setFetchedModels([]);
        return;
      }

      setIsLoadingModels(true);
      try {
        const models = await fetchProviderModels(provider, debouncedApiKey, debouncedApiUrl, abortController.signal);
        if (isMounted) {
          setFetchedModels(models);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (isMounted) {
          console.error("Error loading models:", error);
          setFetchedModels([]);
        }
      } finally {
        if (isMounted) setIsLoadingModels(false);
      }
    }

    loadModels();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [provider, debouncedApiKey, debouncedApiUrl]);

  const handleProviderChange = (newProvider: string) => {
    if (!isProviderId(newProvider)) return;
    syncCurrentProviderData();
    if (!storedRef.current) return;
    const config = storedRef.current.providers[newProvider] || {};
    setProvider(newProvider);
    setApiKey(config.apiKey || "");
    setModel(config.aiModel || "");
    setApiUrl(config.apiEndpoint || "");
    setModelSelectionMode(config.modelSelectionMode === "custom" ? "custom" : "preset");
  };

  const handleSubmit = async () => {
    if (!storedRef.current) return;

    try {
      if (provider !== DEFAULT_PROVIDER_ID) {
        storedRef.current.providers[provider] = {
          apiKey,
          aiModel: model,
          apiEndpoint: apiUrl,
          modelSelectionMode,
        };
      }
      storedRef.current.aiProvider = provider;
      storedRef.current.customInstructions = customInstructions;
      storedRef.current.personalContext = personalContext;
      storedRef.current.defaultLanguage = defaultLanguage;
      storedRef.current.expressionLanguage = expressionLanguage;
      storedRef.current.editableTextHandling = editableTextHandling as "inline" | "panel";

      await saveStoredSettings(storedRef.current);

      if (!hasCompletedOnboarding) {
        // If we are in the onboarding flow, move to step 4 (Finish)
        setStep(4);
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Settings Saved",
          message: "Your preferences have been updated successfully.",
        });
      }
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Save Settings",
        message: String(e),
      });
    }
  };

  const handleTestConnection = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Testing connection...",
    });
    const start = Date.now();

    try {
      await callCustomProvider("You are a helpful assistant.", "Hi", provider, apiKey, model, apiUrl);
      const latency = Date.now() - start;
      toast.style = Toast.Style.Success;
      toast.title = "Connection Successful";
      toast.message = `Response in ${latency}ms`;
    } catch (e) {
      const latency = Date.now() - start;
      const msg = e instanceof Error ? e.message : String(e);
      toast.style = Toast.Style.Failure;
      toast.title = "Connection Failed";
      toast.message = `${msg} (${latency}ms)`;
    }
  };

  if (isLoading || step === null) {
    return <Form isLoading={true} actions={<ActionPanel />} />;
  }

  // Welcome Step (Onboarding only)
  if (step === 1) {
    return <WelcomeStep onNext={() => setStep(2)} />;
  }

  // Usage Introduction Step (Onboarding only)
  if (step === 2) {
    return <UsageStep onNext={() => setStep(3)} />;
  }

  // Finish Step (Onboarding only)
  if (step === 4) {
    return (
      <FinishStep
        onFinish={async () => {
          await setOnboardingCompleted(true);
          pop();
        }}
      />
    );
  }

  // Main Settings Form (Used for both Onboarding Step 2 and Normal Settings)
  const isRaycast = provider === DEFAULT_PROVIDER_ID;
  const isCustom = provider === "custom";

  const isSelectedModelCustom = model !== "" && fetchedModels.length > 0 && !fetchedModels.some((m) => m.id === model);
  const showCustomTextField = modelSelectionMode === "custom" || isSelectedModelCustom;
  const dropdownModelValue = showCustomTextField ? "__custom__" : model;

  return (
    <Form
      isLoading={isLoadingModels}
      navigationTitle={hasCompletedOnboarding ? "Settings" : "Configuration (3/4)"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={hasCompletedOnboarding ? "Save Settings" : "Save and Continue"}
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
          />
          {!isRaycast && (
            <Action
              title="Test Connection"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={handleTestConnection}
            />
          )}
          {environment.isDevelopment && (
            <ActionPanel.Section title="Debug">
              <Action
                title="Reset Onboarding"
                icon={Icon.ExclamationMark}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await setOnboardingCompleted(false);
                  await showToast({
                    title: "Onboarding Reset",
                    message: "Restart the command to see changes.",
                  });
                  pop();
                }}
              />
              <Action
                title="Clear All Settings"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Clear All Settings",
                      message: "Are you sure you want to clear all settings and history? This cannot be undone.",
                      primaryAction: {
                        title: "Clear",
                        style: Alert.ActionStyle.Destructive,
                      },
                    })
                  ) {
                    await LocalStorage.clear();
                    await showToast({
                      title: "Settings Cleared",
                      message: "All local storage has been wiped.",
                    });
                    pop();
                  }
                }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="editableTextHandling"
        title="Editable Text Handling"
        value={editableTextHandling}
        onChange={setEditableTextHandling}
        info="Choose how InFlow processes editable text. Inline Processing applies results directly in place with a HUD, while Panel Preview shows the AI panel with a live preview."
      >
        <Form.Dropdown.Item value="inline" title="Inline Processing" icon={getCommandIcon("inline.svg")} />
        <Form.Dropdown.Item value="panel" title="Panel Preview" icon={getCommandIcon("panel.svg")} />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown
        id="defaultLanguage"
        title="Default Language"
        value={defaultLanguage}
        onChange={setDefaultLanguage}
        info="Your native or reading language. Used as the target language for explanations and summaries. You can refer to this as {Default Language} in custom prompts."
      >
        {SYSTEM_LANGUAGES.map((lang) => (
          <Form.Dropdown.Item
            key={lang.value}
            value={lang.value}
            title={getLanguageDisplayLabel(lang)}
            icon={Icon.Globe}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="expressionLanguage"
        title="Expression Language"
        value={expressionLanguage}
        onChange={setExpressionLanguage}
        info="Your preferred output language for writing or drafting. You can refer to this as {Expression Language} in custom prompts."
      >
        {SYSTEM_LANGUAGES.map((lang) => (
          <Form.Dropdown.Item
            key={lang.value}
            value={lang.value}
            title={getLanguageDisplayLabel(lang)}
            icon={Icon.Globe}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown
        id="provider"
        title="AI Provider"
        value={provider}
        onChange={handleProviderChange}
        info={isCustom ? "Use an OpenAI-compatible custom model provider." : undefined}
      >
        {PROVIDER_REGISTRY.map((providerDefinition) => (
          <Form.Dropdown.Item
            key={providerDefinition.id}
            value={providerDefinition.id}
            title={providerDefinition.label}
            icon={getCommandIcon(providerDefinition.icon)}
          />
        ))}
      </Form.Dropdown>

      {isRaycast && (
        <Form.Description text="Uses your Raycast 'AI Commands Model' setting. Raycast AI does not support streaming output." />
      )}

      {!isRaycast && (
        <>
          {isCustom && (
            <Form.TextField
              id="apiUrl"
              title="Base URL"
              placeholder="e.g., https://api.openai.com/v1"
              value={apiUrl}
              onChange={setApiUrl}
            />
          )}

          <Form.PasswordField
            id="apiKey"
            title="API Key"
            placeholder="sk-..."
            value={apiKey}
            onChange={setApiKey}
            info="Your key is stored locally."
          />

          {fetchedModels.length > 0 ? (
            <>
              <Form.Dropdown
                id="modelSelect"
                title="Model"
                value={dropdownModelValue}
                onChange={(val) => {
                  if (val === "__custom__") {
                    setModelSelectionMode("custom");
                    if (fetchedModels.some((m) => m.id === model)) {
                      setModel("");
                    }
                  } else {
                    setModelSelectionMode("preset");
                    setModel(val);
                  }
                }}
                info="Select an available model fetched from your provider."
              >
                <Form.Dropdown.Item value="" title="Select a model" icon={Icon.Cd} />
                {fetchedModels.map((m) => (
                  <Form.Dropdown.Item
                    key={m.id}
                    value={m.id}
                    title={m.name}
                    icon={getCommandIcon(getProviderDefinition(provider)?.icon)}
                  />
                ))}
                <Form.Dropdown.Item
                  value="__custom__"
                  title="Custom Model ID"
                  icon={getCommandIcon(getProviderDefinition(provider)?.icon)}
                />
              </Form.Dropdown>

              {showCustomTextField && (
                <Form.TextField
                  id="model"
                  title="Custom Model ID"
                  placeholder={getProviderModelPlaceholder(provider)}
                  value={model === "__custom__" ? "" : model}
                  onChange={setModel}
                  info="Enter the model ID manually (e.g., gpt-4-turbo)."
                />
              )}
            </>
          ) : (
            <Form.TextField
              id="model"
              title="Model"
              placeholder={getProviderModelPlaceholder(provider)}
              value={model}
              onChange={setModel}
              info={
                isLoadingModels
                  ? "Loading models..."
                  : "Enter the model ID (not display name). Leave empty to use the provider's default model."
              }
            />
          )}
        </>
      )}

      <Form.Separator />

      <Form.TextArea
        id="personalContext"
        title="Personal Context"
        placeholder={"e.g.\nJimmy Cheung\nRemix Design Studio"}
        value={personalContext}
        onChange={setPersonalContext}
        info="Personal details the AI may use only when relevant, such as email signatures, self-introductions, or profile-related writing. Routine rewrite, translate, and structure tasks should ignore this."
      />

      <Form.TextArea
        id="customInstructions"
        title="Custom Instructions"
        placeholder="e.g., Keep responses concise and professional. Prefer British English spelling."
        value={customInstructions}
        onChange={setCustomInstructions}
        info="Additional preferences for tone, style, and behavior applied to all AI responses."
      />

      <Form.Separator />

      <Form.Description
        title="Tips"
        text="Customize the prompt for each preset command in Raycast's InFlow extension settings to better fit the way you work."
      />
    </Form>
  );
}

export const commandConfig = getViewCommandConfig("inflow-settings");
