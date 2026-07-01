import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import {
  fetchImageReadingModels,
  getModelContextLabel,
  getModelInputPriceLabel,
  getModelOutputPriceLabel,
  getModelPageUrl,
  getModelPriceSummary,
  getModelProviderName,
  getModelReleaseLabel,
  isRecommendedModel,
  searchAndSortModels,
} from "./models";
import type { ModelSort, OpenRouterModel } from "./models";
import { getOpenRouterApiKey } from "./preferences";
import { getSetupGate, saveSetupConfig, type SetupGate } from "./setup-config";
import {
  DEFAULT_OPENROUTER_PARAMETERS,
  DEFAULT_OPENROUTER_PROVIDER,
  type OcrSetupConfig,
  type OpenRouterDataCollection,
  type OpenRouterProviderPreferences,
  type OpenRouterRequestParameters,
} from "./types";

interface SetupViewProps {
  onSaved: () => void;
}

interface OcrRequestSettings {
  provider: OpenRouterProviderPreferences;
  parameters: OpenRouterRequestParameters;
}

interface OcrSettingsFormValues {
  maxTokens: string;
  temperature: string;
  allowFallbacks: string;
  dataCollection: OpenRouterDataCollection;
}

const MODEL_SORT_OPTIONS: Array<{ title: string; value: ModelSort }> = [
  { title: "Recommended", value: "recommended" },
  { title: "Name", value: "name" },
  { title: "Price: Low to High", value: "price-low-to-high" },
  { title: "Price: High to Low", value: "price-high-to-low" },
  { title: "Newest", value: "newest" },
  { title: "Oldest", value: "oldest" },
  { title: "Context: Largest First", value: "context-high-to-low" },
];

export function SetupView({ onSaved }: SetupViewProps) {
  const [gate, setGate] = useState<SetupGate | "checking">("checking");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    async function checkSetup(): Promise<void> {
      setGate("checking");
      setGate(await getSetupGate());
    }

    void checkSetup();
  }, [reloadCount]);

  if (gate === "checking") {
    return <List isLoading />;
  }

  if (gate.kind === "missing_api_key") {
    return <ApiKeyRequiredView />;
  }

  if (gate.kind === "invalid_api_key") {
    return (
      <InvalidApiKeyView
        message={gate.message}
        retryable={gate.retryable}
        onRetry={() => setReloadCount((count) => count + 1)}
      />
    );
  }

  return <ModelPicker onSaved={onSaved} />;
}

function InvalidApiKeyView({
  message,
  retryable,
  onRetry,
}: {
  message: string;
  retryable: boolean;
  onRetry: () => void;
}) {
  return (
    <Detail
      markdown={`# API Key Problem\n\n${message}`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          {retryable ? (
            <Action title="Try Again" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={onRetry} />
          ) : null}
          <Action.OpenInBrowser title="Create OpenRouter API Key" url="https://openrouter.ai/keys" />
        </ActionPanel>
      }
    />
  );
}

function ApiKeyRequiredView() {
  return (
    <Detail
      markdown="# OpenRouter API Key Needed\n\nAdd your OpenRouter API key in extension preferences, then run setup again."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Create OpenRouter API Key" url="https://openrouter.ai/keys" />
        </ActionPanel>
      }
    />
  );
}

function OcrSettingsForm({
  settings,
  onSave,
}: {
  settings: OcrRequestSettings;
  onSave: (settings: OcrRequestSettings) => void;
}) {
  const { pop } = useNavigation();
  const [maxTokens, setMaxTokens] = useState(String(settings.parameters.max_tokens));
  const [temperature, setTemperature] = useState(String(settings.parameters.temperature));
  const [allowFallbacks, setAllowFallbacks] = useState(String(settings.provider.allow_fallbacks));
  const [dataCollection, setDataCollection] = useState<OpenRouterDataCollection>(settings.provider.data_collection);
  const [maxTokensError, setMaxTokensError] = useState<string>();
  const [temperatureError, setTemperatureError] = useState<string>();

  async function handleSubmit(values: OcrSettingsFormValues): Promise<void> {
    const normalizedSettings = normalizeOcrSettingsFormValues(values);

    if ("errors" in normalizedSettings) {
      setMaxTokensError(normalizedSettings.errors.maxTokens);
      setTemperatureError(normalizedSettings.errors.temperature);
      return;
    }

    onSave(normalizedSettings.settings);
    await showToast({
      style: Toast.Style.Success,
      title: "OCR settings updated",
    });
    pop();
  }

  async function handleReset(): Promise<void> {
    const defaultSettings = getDefaultOcrRequestSettings();

    onSave(defaultSettings);
    await showToast({
      style: Toast.Style.Success,
      title: "OCR settings reset",
    });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save OCR Settings" onSubmit={handleSubmit} />
          <Action
            title="Reset to Defaults"
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={handleReset}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="These settings are saved locally with your selected OpenRouter model and sent in OCR API calls." />
      <Form.TextField
        id="temperature"
        title="Temperature"
        placeholder="0"
        value={temperature}
        error={temperatureError}
        onChange={(value) => {
          setTemperature(value);
          setTemperatureError(undefined);
        }}
      />
      <Form.TextField
        id="maxTokens"
        title="Max Tokens"
        placeholder="8192"
        value={maxTokens}
        error={maxTokensError}
        onChange={(value) => {
          setMaxTokens(value);
          setMaxTokensError(undefined);
        }}
      />
      <Form.Dropdown id="allowFallbacks" title="Provider Fallbacks" value={allowFallbacks} onChange={setAllowFallbacks}>
        <Form.Dropdown.Item title="On" value="true" />
        <Form.Dropdown.Item title="Off" value="false" />
      </Form.Dropdown>
      <Form.Dropdown
        id="dataCollection"
        title="Data Collection"
        value={dataCollection}
        onChange={(value) => setDataCollection(value as OpenRouterDataCollection)}
      >
        <Form.Dropdown.Item title="Deny" value="deny" />
        <Form.Dropdown.Item title="Allow" value="allow" />
      </Form.Dropdown>
    </Form>
  );
}

function normalizeOcrSettingsFormValues(values: OcrSettingsFormValues):
  | { settings: OcrRequestSettings }
  | {
      errors: {
        maxTokens?: string;
        temperature?: string;
      };
    } {
  const maxTokens = Number(values.maxTokens);
  const temperature = Number(values.temperature);
  const errors: { maxTokens?: string; temperature?: string } = {};

  if (!Number.isFinite(maxTokens) || maxTokens < 1) {
    errors.maxTokens = "Max tokens must be at least 1.";
  }

  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    errors.temperature = "Temperature must be between 0 and 2.";
  }

  if (errors.maxTokens || errors.temperature) {
    return { errors };
  }

  return {
    settings: {
      provider: {
        allow_fallbacks: values.allowFallbacks === "true",
        data_collection: values.dataCollection,
      },
      parameters: {
        max_tokens: Math.floor(maxTokens),
        temperature,
      },
    },
  };
}

function getDefaultOcrRequestSettings(): OcrRequestSettings {
  return {
    provider: {
      ...DEFAULT_OPENROUTER_PROVIDER,
    },
    parameters: {
      ...DEFAULT_OPENROUTER_PARAMETERS,
    },
  };
}

interface ModelPickerProps {
  existingConfig?: OcrSetupConfig;
  currentModelId?: string;
  onBack?: () => void;
  onSaved: () => void;
}

export function ModelPicker({ existingConfig, currentModelId, onBack, onSaved }: ModelPickerProps) {
  const apiKey = getOpenRouterApiKey();
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<ModelSort>("recommended");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reloadCount, setReloadCount] = useState(0);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [settings, setSettings] = useState<OcrRequestSettings>(() => ({
    provider: existingConfig?.provider ?? DEFAULT_OPENROUTER_PROVIDER,
    parameters: existingConfig?.parameters ?? DEFAULT_OPENROUTER_PARAMETERS,
  }));

  useEffect(() => {
    let isCancelled = false;

    async function loadModels(): Promise<void> {
      setIsLoading(true);
      setError(undefined);

      try {
        const imageReadingModels = await fetchImageReadingModels({
          apiKey,
        });

        if (!isCancelled) {
          setModels(imageReadingModels);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Couldn't load OpenRouter models. Try again.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadModels();

    return () => {
      isCancelled = true;
    };
  }, [apiKey, reloadCount]);

  const visibleModels = useMemo(() => searchAndSortModels(models, { searchText, sort }), [models, searchText, sort]);

  async function handleSelectModel(model: OpenRouterModel): Promise<void> {
    if (!apiKey) {
      setError("Add your OpenRouter API key in extension preferences and try again.");
      return;
    }

    if (existingConfig) {
      await saveSetupConfig({
        ...existingConfig,
        apiKey,
        model: model.id,
        provider: settings.provider,
        parameters: settings.parameters,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Model updated",
        message: model.name,
      });
      onSaved();
      return;
    }

    await saveSetupConfig({
      apiKey,
      model: model.id,
      provider: settings.provider,
      parameters: settings.parameters,
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Setup complete",
      message: model.name,
    });
    onSaved();
  }

  if (error) {
    return (
      <Detail
        markdown={`# Couldn't Load Models\n\n${error}\n\nGo back to check your API key, or try again.`}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={() => setReloadCount((count) => count + 1)} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action.Push
              title="Edit OCR Settings"
              icon={Icon.Gear}
              target={<OcrSettingsForm settings={settings} onSave={setSettings} />}
            />
            {onBack ? <Action title="Back" shortcut={{ modifiers: ["cmd"], key: "[" }} onAction={onBack} /> : null}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      isShowingDetail={!isLoading && visibleModels.length > 0 && isShowingDetail}
      searchText={searchText}
      searchBarPlaceholder="Search by model name, slug, family, or provider"
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Sort Models" value={sort} onChange={(value) => setSort(value as ModelSort)}>
          {MODEL_SORT_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No Image-Reading Models Found"
        description="Try another search or change the sort order."
        actions={
          <ActionPanel>
            {onBack ? <Action title="Back" shortcut={{ modifiers: ["cmd"], key: "[" }} onAction={onBack} /> : null}
          </ActionPanel>
        }
      />
      {visibleModels.map((model) => (
        <ModelListItem
          key={model.id}
          model={model}
          settings={settings}
          isShowingDetail={isShowingDetail}
          isCurrentModel={model.id === currentModelId}
          onUse={() => void handleSelectModel(model)}
          onToggleDetail={() => setIsShowingDetail((value) => !value)}
          onSaveSettings={setSettings}
          onBack={onBack}
        />
      ))}
    </List>
  );
}

function ModelListItem({
  model,
  settings,
  isShowingDetail,
  isCurrentModel,
  onUse,
  onToggleDetail,
  onSaveSettings,
  onBack,
}: {
  model: OpenRouterModel;
  settings: OcrRequestSettings;
  isShowingDetail: boolean;
  isCurrentModel?: boolean;
  onUse: () => void;
  onToggleDetail: () => void;
  onSaveSettings: (settings: OcrRequestSettings) => void;
  onBack?: () => void;
}) {
  const recommended = isRecommendedModel(model);
  const accessories: List.Item.Accessory[] = isShowingDetail
    ? []
    : [
        ...(isCurrentModel ? [{ icon: Icon.Check, tooltip: "Current model" }] : []),
        ...(recommended ? [{ icon: Icon.Stars, tooltip: "Recommended" }] : []),
        { tag: getModelPriceSummary(model) },
      ];

  return (
    <List.Item
      title={model.name}
      subtitle={isShowingDetail ? undefined : model.id}
      keywords={[model.id]}
      icon={recommended ? Icon.Stars : Icon.Box}
      accessories={accessories}
      detail={<ModelDetail model={model} recommended={recommended} settings={settings} />}
      actions={
        <ActionPanel>
          <Action title={isCurrentModel ? "Current Model" : "Use Model"} icon={Icon.Check} onAction={onUse} />
          <Action.Push
            title="Edit OCR Settings"
            icon={Icon.Gear}
            target={<OcrSettingsForm settings={settings} onSave={onSaveSettings} />}
          />
          <Action
            title="Toggle Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action.CopyToClipboard
            title="Copy Model Slug"
            content={model.id}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.OpenInBrowser
            title="View on OpenRouter"
            url={getModelPageUrl(model)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          {onBack ? (
            <Action title="Back" icon={Icon.ArrowLeft} shortcut={{ modifiers: ["cmd"], key: "[" }} onAction={onBack} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function ModelDetail({
  model,
  recommended,
  settings,
}: {
  model: OpenRouterModel;
  recommended: boolean;
  settings: OcrRequestSettings;
}) {
  const description = model.description.trim();

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Model" text={model.name} />
          {description ? <List.Item.Detail.Metadata.Label title="Description" text={description} /> : null}
          <List.Item.Detail.Metadata.Label title="Slug" text={model.id} />
          <List.Item.Detail.Metadata.Link title="OpenRouter" target={getModelPageUrl(model)} text="View Model Page" />
          <List.Item.Detail.Metadata.Label title="Provider" text={getModelProviderName(model)} />
          {recommended ? (
            <List.Item.Detail.Metadata.TagList title="Highlight">
              <List.Item.Detail.Metadata.TagList.Item text="Recommended" color={Color.Yellow} />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Input">
            {model.architecture.inputModalities.map((modality) => (
              <List.Item.Detail.Metadata.TagList.Item key={modality} text={modality} color={Color.Blue} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Output">
            {model.architecture.outputModalities.map((modality) => (
              <List.Item.Detail.Metadata.TagList.Item key={modality} text={modality} color={Color.Green} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Context Window" text={getModelContextLabel(model)} />
          <List.Item.Detail.Metadata.Label title="Released" text={getModelReleaseLabel(model)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Input Price" text={`${getModelInputPriceLabel(model)} / 1M tokens`} />
          <List.Item.Detail.Metadata.Label
            title="Output Price"
            text={`${getModelOutputPriceLabel(model)} / 1M tokens`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Temperature" text={String(settings.parameters.temperature)} />
          <List.Item.Detail.Metadata.Label title="Max Tokens" text={settings.parameters.max_tokens.toLocaleString()} />
          <List.Item.Detail.Metadata.Label
            title="Provider Fallbacks"
            text={settings.provider.allow_fallbacks ? "On" : "Off"}
          />
          <List.Item.Detail.Metadata.Label
            title="Data Collection"
            text={settings.provider.data_collection === "deny" ? "Denied" : "Allowed"}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
