import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  LaunchProps,
  LaunchType,
  List,
  Toast,
  getSelectedText,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { addHistoryEntry } from "./history-store";
import { LANGUAGE_CHOICES, getLanguageTitle, resolveTargetLanguage } from "./languages";
import { getTierLabel } from "./models";
import {
  PROVIDER_TITLES,
  getMaxOutputTokens,
  getOrderedProviderIds,
  getProviderConfig,
  getTimeoutMs,
  readPreferences,
} from "./preferences";
import { MissingAPIKeyError, translateWithProvider } from "./providers";
import { loadRuntimeSettings, updateRuntimeSetting } from "./runtime-settings";
import { speakText } from "./tts";
import {
  ModelTier,
  PromptProfile,
  RuntimeSettings,
  TranslationRequest,
  TranslationResult,
  TranslationStyle,
} from "./types";

const providerIcons = {
  deepseek: Icon.Waveform,
  mimo: Icon.AppWindowGrid2x2,
  minimax: Icon.Bolt,
  gemini: Icon.Stars,
  kimi: Icon.Moon,
  openai: Icon.Message,
} as const;

const PROMPT_PROFILE_LABELS: Record<PromptProfile, string> = {
  screenshot: "Screenshot OCR",
  general: "General",
  technical: "Technical",
  academic: "Academic",
  legal: "Legal",
  subtitle: "Subtitle",
  custom: "Custom",
};

const STYLE_LABELS: Record<TranslationStyle, string> = {
  balanced: "Balanced",
  faithful: "Faithful",
  polished: "Polished",
  academic: "Academic",
};

export default function Command(props: LaunchProps) {
  const preferences = useMemo(() => readPreferences(), []);
  const [inputText, setInputText] = useState<string>();
  const [targetLanguage, setTargetLanguage] = useState<string>(preferences.targetLanguage);
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [manualRunId, setManualRunId] = useState(0);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>();
  const requestSequence = useRef(0);
  const userEditedInput = useRef(false);

  useEffect(() => {
    void loadRuntimeSettings().then(setRuntimeSettings);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function setup() {
      const launchText = normalizeInputText(props.fallbackText ?? "");
      if (launchText) {
        if (isMounted) setInputText(launchText);
        return;
      }

      const selected = await readSelectedText();
      if (selected) {
        if (isMounted && !userEditedInput.current) setInputText(selected);
        return;
      }

      const clipboard = await readClipboardText();
      if (isMounted && !userEditedInput.current) setInputText(clipboard);
    }

    void setup();
    return () => {
      isMounted = false;
    };
  }, [props.fallbackText]);

  useEffect(() => {
    if (inputText === undefined || !runtimeSettings) return;

    const sequence = ++requestSequence.current;
    const text = normalizeInputText(inputText);

    if (!text) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      void runTranslations(text, sequence);
    }, 350);

    return () => clearTimeout(timer);
  }, [inputText, targetLanguage, manualRunId, runtimeSettings]);

  async function runTranslations(text: string, sequence: number) {
    if (!runtimeSettings) return;

    const providerIds = getOrderedProviderIds(preferences);
    const pendingResults = providerIds.map<TranslationResult>((providerId) => ({
      providerId,
      providerTitle: PROVIDER_TITLES[providerId],
      status: "pending",
    }));
    setResults(pendingResults);

    const resolvedTargetLanguage = resolveTargetLanguage(targetLanguage, text);
    const request: TranslationRequest = {
      text,
      targetLanguage: resolvedTargetLanguage,
      targetLanguageTitle: getLanguageTitle(resolvedTargetLanguage),
      style: runtimeSettings.translationStyle,
      promptProfile: runtimeSettings.promptProfile,
      customPromptInstructions: runtimeSettings.customPromptInstructions || preferences.customPromptInstructions,
      timeoutMs: getTimeoutMs(preferences),
      maxOutputTokens: getMaxOutputTokens(preferences),
    };

    await Promise.all(
      providerIds.map(async (providerId) => {
        const config = getProviderConfig(providerId, preferences, runtimeSettings.modelTier);
        const startedAt = Date.now();

        try {
          const translation = await translateWithProvider(config, request);
          updateResult(sequence, {
            providerId,
            providerTitle: config.title,
            modelName: config.model,
            status: "success",
            translation,
            durationMs: Date.now() - startedAt,
          });
        } catch (error) {
          updateResult(sequence, {
            providerId,
            providerTitle: config.title,
            modelName: config.model,
            status: error instanceof MissingAPIKeyError ? "missing-key" : "error",
            error: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - startedAt,
          });
        }
      }),
    );

    if (sequence === requestSequence.current) {
      setIsLoading(false);
    }
  }

  function updateResult(sequence: number, result: TranslationResult) {
    if (sequence !== requestSequence.current) return;
    setResults((prev) => prev.map((r) => (r.providerId === result.providerId ? result : r)));
  }

  function retry() {
    setManualRunId((v) => v + 1);
  }

  function handleSearchTextChange(text: string) {
    userEditedInput.current = true;
    setInputText(text);
  }

  async function switchModelTier(tier: ModelTier) {
    const updated = await updateRuntimeSetting("modelTier", tier);
    setRuntimeSettings(updated);
    await showToast({ style: Toast.Style.Success, title: `Model: ${getTierLabel(tier)}` });
  }

  async function switchPromptProfile(profile: PromptProfile) {
    const updated = await updateRuntimeSetting("promptProfile", profile);
    setRuntimeSettings(updated);
    await showToast({ style: Toast.Style.Success, title: `Profile: ${PROMPT_PROFILE_LABELS[profile]}` });
  }

  async function switchStyle(style: TranslationStyle) {
    const updated = await updateRuntimeSetting("translationStyle", style);
    setRuntimeSettings(updated);
    await showToast({ style: Toast.Style.Success, title: `Style: ${STYLE_LABELS[style]}` });
  }

  const resolvedTargetLanguage = resolveTargetLanguage(targetLanguage, inputText ?? "");
  const targetLanguageTitle = getLanguageTitle(resolvedTargetLanguage);
  const currentTier = runtimeSettings?.modelTier ?? "fast";
  const currentProfile = runtimeSettings?.promptProfile ?? "general";
  const currentStyle = runtimeSettings?.translationStyle ?? "balanced";

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={results.length > 0}
      navigationTitle={`AI Translate · ${getTierLabel(currentTier)} · ${PROMPT_PROFILE_LABELS[currentProfile]}`}
      onSearchTextChange={handleSearchTextChange}
      searchBarAccessory={
        <List.Dropdown tooltip="Target Language" value={targetLanguage} onChange={setTargetLanguage}>
          {LANGUAGE_CHOICES.map((lang) => (
            <List.Dropdown.Item key={lang.value} title={lang.title} value={lang.value} />
          ))}
        </List.Dropdown>
      }
      searchBarPlaceholder="Select text, paste, or type to translate..."
      searchText={inputText ?? ""}
    >
      {results.map((result) => (
        <List.Item
          key={result.providerId}
          id={result.providerId}
          icon={{ source: providerIcons[result.providerId], tintColor: iconColor(result.status) }}
          title={result.providerTitle}
          subtitle={subtitle(result)}
          accessories={accessories(result, targetLanguageTitle)}
          detail={<List.Item.Detail markdown={detailMarkdown(result, inputText ?? "")} />}
          actions={
            <ResultActions
              result={result}
              sourceText={inputText ?? ""}
              currentTier={currentTier}
              currentProfile={currentProfile}
              currentStyle={currentStyle}
              onRetry={retry}
              onSwitchModelTier={switchModelTier}
              onSwitchPromptProfile={switchPromptProfile}
              onSwitchStyle={switchStyle}
            />
          }
        />
      ))}
      <List.EmptyView
        icon={Icon.Text}
        title={inputText === undefined ? "Reading selected text..." : "Select or type text to translate"}
        description={`Model: ${getTierLabel(currentTier)} · Profile: ${PROMPT_PROFILE_LABELS[currentProfile]}`}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Camera}
              title="Screenshot Translate"
              onAction={() => launchCommand({ name: "screenshot-translate", type: LaunchType.UserInitiated })}
            />
            <Action
              icon={Icon.Gear}
              title="Translation Settings"
              onAction={() => launchCommand({ name: "translation-settings", type: LaunchType.UserInitiated })}
            />
            <Action icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function ResultActions({
  result,
  sourceText,
  currentTier,
  currentProfile,
  currentStyle,
  onRetry,
  onSwitchModelTier,
  onSwitchPromptProfile,
  onSwitchStyle,
}: {
  result: TranslationResult;
  sourceText: string;
  currentTier: ModelTier;
  currentProfile: PromptProfile;
  currentStyle: TranslationStyle;
  onRetry: () => void;
  onSwitchModelTier: (tier: ModelTier) => void;
  onSwitchPromptProfile: (profile: PromptProfile) => void;
  onSwitchStyle: (style: TranslationStyle) => void;
}) {
  const canUseTranslation = result.status === "success" && Boolean(result.translation);

  function recordHistory() {
    if (!canUseTranslation) return;
    void addHistoryEntry({
      kind: "translate",
      source: sourceText,
      output: result.translation ?? "",
      provider: result.providerTitle,
      model: result.modelName,
    });
  }

  return (
    <ActionPanel>
      {canUseTranslation && (
        <ActionPanel.Section>
          <Action.CopyToClipboard content={result.translation ?? ""} title="Copy Translation" onCopy={recordHistory} />
          <Action.Paste
            content={result.translation ?? ""}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            title="Paste Translation"
            onPaste={recordHistory}
          />
          <Action
            icon={Icon.SpeakerOn}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            title="Read Translation Aloud"
            onAction={() => void speakText(result.translation ?? "")}
          />
          <Action
            icon={Icon.SpeakerOn}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            title="Read Source Aloud"
            onAction={() => void speakText(sourceText)}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Translate">
        <Action
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          title="Retry"
          onAction={onRetry}
        />
        <Action
          icon={Icon.Camera}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          title="Screenshot Translate"
          onAction={() => launchCommand({ name: "screenshot-translate", type: LaunchType.UserInitiated })}
        />
        <Action.CopyToClipboard
          content={sourceText}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          title="Copy Source Text"
        />
      </ActionPanel.Section>
      <ActionPanel.Submenu
        icon={Icon.Bolt}
        shortcut={{ modifiers: ["cmd"], key: "m" }}
        title={`Model: ${getTierLabel(currentTier)}`}
      >
        {(["fast", "pro", "custom"] as ModelTier[]).map((tier) => (
          <Action
            key={tier}
            icon={tier === currentTier ? Icon.Checkmark : Icon.Circle}
            title={getTierLabel(tier)}
            onAction={() => onSwitchModelTier(tier)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
        title={`Profile: ${PROMPT_PROFILE_LABELS[currentProfile]}`}
      >
        {(Object.keys(PROMPT_PROFILE_LABELS) as PromptProfile[]).map((profile) => (
          <Action
            key={profile}
            icon={profile === currentProfile ? Icon.Checkmark : Icon.Circle}
            title={PROMPT_PROFILE_LABELS[profile]}
            onAction={() => onSwitchPromptProfile(profile)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
        title={`Style: ${STYLE_LABELS[currentStyle]}`}
      >
        {(Object.keys(STYLE_LABELS) as TranslationStyle[]).map((style) => (
          <Action
            key={style}
            icon={style === currentStyle ? Icon.Checkmark : Icon.Circle}
            title={STYLE_LABELS[style]}
            onAction={() => onSwitchStyle(style)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Section title="Settings">
        <Action
          icon={Icon.Gear}
          title="Translation Settings"
          onAction={() => launchCommand({ name: "translation-settings", type: LaunchType.UserInitiated })}
        />
        <Action icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
        {(result.status === "error" || result.status === "missing-key") && (
          <Action
            icon={Icon.ExclamationMark}
            title="Show Error"
            onAction={() =>
              showToast({ style: Toast.Style.Failure, title: result.providerTitle, message: result.error })
            }
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function normalizeInputText(text: string | undefined): string {
  return (text ?? "").replace(/\r\n/g, "\n").trim().slice(0, 12000);
}

async function readSelectedText(): Promise<string> {
  try {
    return normalizeInputText(await getSelectedText());
  } catch {
    return "";
  }
}

async function readClipboardText(): Promise<string> {
  try {
    return normalizeInputText((await Clipboard.readText()) ?? "");
  } catch {
    return "";
  }
}

function subtitle(result: TranslationResult): string {
  switch (result.status) {
    case "pending":
      return "Translating...";
    case "missing-key":
      return "API key required";
    case "error":
      return result.error ?? "Translation failed";
    case "success":
      return singleLinePreview(result.translation ?? "");
  }
}

function accessories(result: TranslationResult, targetLanguageTitle: string): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];
  if (result.modelName) {
    items.push({ tag: result.modelName });
  }
  items.push({ text: targetLanguageTitle });
  if (result.durationMs !== undefined && result.status !== "pending") {
    items.push({ text: `${(result.durationMs / 1000).toFixed(1)}s` });
  }
  return items;
}

function iconColor(status: TranslationResult["status"]): Color {
  switch (status) {
    case "success":
      return Color.Green;
    case "error":
    case "missing-key":
      return Color.Red;
    case "pending":
      return Color.Blue;
  }
}

function detailMarkdown(result: TranslationResult, sourceText: string): string {
  const modelTag = result.modelName ? ` · \`${result.modelName}\`` : "";

  if (result.status === "pending") {
    return `**${result.providerTitle}**${modelTag}\n\nTranslating...`;
  }

  if (result.status === "missing-key") {
    return [
      `**${result.providerTitle}**${modelTag}`,
      "",
      "API key is not configured. Open **Extension Preferences** to add the key.",
      "",
      "---",
      "",
      quoted(sourceText),
    ].join("\n");
  }

  if (result.status === "error") {
    return [
      `**${result.providerTitle}**${modelTag}`,
      "",
      `Error: ${result.error ?? "Translation failed."}`,
      "",
      "---",
      "",
      quoted(sourceText),
    ].join("\n");
  }

  return [
    `**${result.providerTitle}**${modelTag}`,
    "",
    "## Translation",
    "",
    result.translation ?? "",
    "",
    "---",
    "",
    "**Source**",
    "",
    quoted(sourceText),
  ].join("\n");
}

function quoted(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function singleLinePreview(text: string): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  return singleLine.length > 96 ? `${singleLine.slice(0, 96)}...` : singleLine;
}
