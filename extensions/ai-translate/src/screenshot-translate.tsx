import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { useEffect, useMemo, useRef, useState } from "react";
import { addHistoryEntry } from "./history-store";
import { LANGUAGE_CHOICES, getLanguageTitle, resolveTargetLanguage } from "./languages";
import { getModelOptions, getModelTitle, getTierLabel } from "./models";
import { recognizeScreenshotText } from "./ocr-engines";
import { openScreenRecordingSettings, reportOcrError } from "./ocr-errors";
import {
  PROVIDER_TITLES,
  getMaxOutputTokens,
  getOrderedProviderIds,
  getProviderConfig,
  getRuntimeProviderIds,
  getTimeoutMs,
  readPreferences,
} from "./preferences";
import { MissingAPIKeyError, translateWithProvider } from "./providers";
import { loadRuntimeSettings, updateRuntimeSetting, updateRuntimeSettings } from "./runtime-settings";
import { speakText } from "./tts";
import { getDefaultTTSModel, getTTSModelOptions, getTTSModelTitle, TTS_PROVIDER_LABELS } from "./tts-models";
import {
  ModelTier,
  ProviderId,
  ProviderSelectionMode,
  PromptProfile,
  RuntimeSettings,
  TranslationRequest,
  TranslationResult,
  TranslationStyle,
  TTSProvider,
} from "./types";
import { PROMPT_PROFILE_LABELS, PROVIDER_ICONS, STYLE_LABELS, quoted } from "./ui-constants";

export default function Command() {
  const preferences = useMemo(() => readPreferences(), []);
  const [sourceText, setSourceText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<string>(preferences.targetLanguage);
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ocrDone, setOcrDone] = useState(false);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [ocrError, setOcrError] = useState<string>();
  const [ocrTitle, setOcrTitle] = useState("No text captured");
  const [ocrNeedsPermission, setOcrNeedsPermission] = useState(false);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>();
  const [manualRunId, setManualRunId] = useState(0);
  const requestSequence = useRef(0);
  const captureSequence = useRef(0);

  useEffect(() => {
    void loadRuntimeSettings().then(setRuntimeSettings);
  }, []);

  useEffect(() => {
    void captureScreenshot();
    return () => {
      captureSequence.current += 1;
      requestSequence.current += 1;
    };
  }, []);

  async function captureScreenshot() {
    const captureId = ++captureSequence.current;
    requestSequence.current += 1;
    setOcrFailed(false);
    setOcrError(undefined);
    setOcrTitle("No text captured");
    setOcrNeedsPermission(false);
    setOcrDone(false);
    setSourceText("");
    setResults([]);
    setIsLoading(true);

    await closeMainWindow({ clearRootSearch: false });

    try {
      const text = await recognizeScreenshotText(preferences);

      if (captureId !== captureSequence.current) return;

      if (!text) {
        activateRaycast();
        setOcrFailed(true);
        setOcrTitle("No text detected");
        setOcrError("The capture had no recognizable text. Choose Retake Screenshot to try again.");
        setIsLoading(false);
        return;
      }

      activateRaycast();
      setSourceText(text);
      setOcrDone(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Text captured",
        message: `${text.length} characters · translating…`,
      });
    } catch (error) {
      if (captureId !== captureSequence.current) return;

      activateRaycast();
      setIsLoading(false);
      const description = await reportOcrError(error);
      setOcrFailed(true);
      setOcrNeedsPermission(description.isPermission);
      setOcrTitle(description.isCancelled ? "Screenshot cancelled" : description.title);
      setOcrError(
        description.isCancelled
          ? "No region was selected. Choose Retake Screenshot to try again."
          : description.message || "Choose Retake Screenshot to try again.",
      );
    }
  }

  useEffect(() => {
    if (!ocrDone || !sourceText || !runtimeSettings) return;

    const sequence = ++requestSequence.current;
    setIsLoading(true);

    const timer = setTimeout(() => void runTranslations(sourceText, sequence), 100);
    return () => clearTimeout(timer);
  }, [ocrDone, sourceText, targetLanguage, manualRunId, runtimeSettings]);

  async function runTranslations(text: string, sequence: number) {
    if (!runtimeSettings) return;

    const providerIds = getRuntimeProviderIds(preferences, runtimeSettings);
    setResults(
      providerIds.map((id) => ({ providerId: id, providerTitle: PROVIDER_TITLES[id], status: "pending" as const })),
    );

    const resolved = resolveTargetLanguage(targetLanguage, text);
    const request: TranslationRequest = {
      text,
      targetLanguage: resolved,
      targetLanguageTitle: getLanguageTitle(resolved),
      style: runtimeSettings.translationStyle,
      promptProfile: runtimeSettings.promptProfile,
      customPromptInstructions: runtimeSettings.customPromptInstructions || preferences.customPromptInstructions,
      timeoutMs: getTimeoutMs(preferences),
      maxOutputTokens: getMaxOutputTokens(preferences),
    };

    await Promise.all(
      providerIds.map(async (providerId) => {
        const config = getProviderConfig(
          providerId,
          preferences,
          runtimeSettings.modelTier,
          runtimeSettings.modelOverrides[providerId],
        );
        const t0 = Date.now();
        try {
          const translation = await translateWithProvider(config, request);
          updateResult(sequence, {
            providerId,
            providerTitle: config.title,
            modelName: config.model,
            status: "success",
            translation,
            durationMs: Date.now() - t0,
          });
        } catch (error) {
          updateResult(sequence, {
            providerId,
            providerTitle: config.title,
            modelName: config.model,
            status: error instanceof MissingAPIKeyError ? "missing-key" : "error",
            error: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - t0,
          });
        }
      }),
    );

    if (sequence === requestSequence.current) setIsLoading(false);
  }

  function updateResult(sequence: number, result: TranslationResult) {
    if (sequence !== requestSequence.current) return;
    setResults((prev) => prev.map((r) => (r.providerId === result.providerId ? result : r)));
  }

  async function retake() {
    await captureScreenshot();
  }

  async function switchTier(tier: ModelTier) {
    setRuntimeSettings(await updateRuntimeSettings({ modelTier: tier, modelOverrides: {} }));
    await showToast({ style: Toast.Style.Success, title: `Model: ${getTierLabel(tier)}` });
  }
  async function switchProviderMode(mode: ProviderSelectionMode, selectedProviderId?: ProviderId) {
    const updated = await updateRuntimeSettings({
      providerMode: mode,
      selectedProviderId: selectedProviderId ?? runtimeSettings?.selectedProviderId,
    });
    setRuntimeSettings(updated);
    await showToast({
      style: Toast.Style.Success,
      title:
        mode === "enabled" ? "Providers: All Enabled" : `Provider: ${PROVIDER_TITLES[updated.selectedProviderId!]}`,
    });
  }
  async function switchProviderModel(providerId: ProviderId, model: string | undefined) {
    const overrides = { ...(runtimeSettings?.modelOverrides ?? {}) };
    if (model) {
      overrides[providerId] = model;
    } else {
      delete overrides[providerId];
    }
    const updated = await updateRuntimeSettings({ modelOverrides: overrides });
    setRuntimeSettings(updated);
    await showToast({
      style: Toast.Style.Success,
      title: model
        ? `${PROVIDER_TITLES[providerId]} model selected`
        : `${PROVIDER_TITLES[providerId]} uses ${getTierLabel(updated.modelTier)}`,
      message: model ? getModelTitle(providerId, model) : undefined,
    });
  }
  async function switchProfile(profile: PromptProfile) {
    setRuntimeSettings(await updateRuntimeSetting("promptProfile", profile));
    await showToast({ style: Toast.Style.Success, title: `Profile: ${PROMPT_PROFILE_LABELS[profile]}` });
  }
  async function switchStyle(style: TranslationStyle) {
    setRuntimeSettings(await updateRuntimeSetting("translationStyle", style));
    await showToast({ style: Toast.Style.Success, title: `Style: ${STYLE_LABELS[style]}` });
  }
  async function switchTtsProvider(provider: TTSProvider) {
    setRuntimeSettings(
      await updateRuntimeSettings({ ttsProvider: provider, ttsModel: getDefaultTTSModel(provider, preferences) }),
    );
    await showToast({ style: Toast.Style.Success, title: `Voice: ${TTS_PROVIDER_LABELS[provider]}` });
  }
  async function switchTtsModel(model: string) {
    const provider = runtimeSettings?.ttsProvider ?? "qwen";
    setRuntimeSettings(await updateRuntimeSettings({ ttsModel: model }));
    await showToast({
      style: Toast.Style.Success,
      title: "Voice model selected",
      message: getTTSModelTitle(provider, model),
    });
  }

  const currentTier = runtimeSettings?.modelTier ?? "fast";
  const currentProfile = runtimeSettings?.promptProfile ?? "screenshot";
  const currentStyle = runtimeSettings?.translationStyle ?? "balanced";
  const allProviderIds = getOrderedProviderIds(preferences);
  const selectedProviderId = runtimeSettings?.selectedProviderId;
  const providerScopeTitle =
    runtimeSettings?.providerMode === "single" && selectedProviderId && allProviderIds.includes(selectedProviderId)
      ? PROVIDER_TITLES[selectedProviderId]
      : "All Providers";
  const targetLangTitle = getLanguageTitle(resolveTargetLanguage(targetLanguage, sourceText));

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={ocrDone && results.length > 0}
      navigationTitle={`Screenshot Translate · ${providerScopeTitle} · ${getTierLabel(currentTier)}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Target Language" value={targetLanguage} onChange={setTargetLanguage}>
          {LANGUAGE_CHOICES.map((l) => (
            <List.Dropdown.Item key={l.value} title={l.title} value={l.value} />
          ))}
        </List.Dropdown>
      }
      searchBarPlaceholder={ocrDone ? "OCR result" : "Capturing screenshot..."}
    >
      {!ocrDone && !ocrFailed && (
        <List.EmptyView
          icon={Icon.Camera}
          title="Capturing screenshot..."
          description="Select a screen region to OCR and translate."
        />
      )}
      {ocrFailed && (
        <List.EmptyView
          icon={ocrNeedsPermission ? Icon.Lock : Icon.XMarkCircle}
          title={ocrTitle}
          description={ocrError ?? "Screenshot was cancelled or no text was detected."}
          actions={
            <ActionPanel>
              {ocrNeedsPermission && (
                <Action
                  icon={Icon.Lock}
                  title="Open Screen Recording Settings"
                  onAction={() => void openScreenRecordingSettings()}
                />
              )}
              <Action
                icon={Icon.Camera}
                title="Retake Screenshot"
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={() => {
                  setOcrFailed(false);
                  setIsLoading(true);
                  void captureScreenshot();
                }}
              />
              <Action icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}

      {ocrDone && (
        <List.Section title="Source">
          <List.Item
            icon={Icon.TextCursor}
            title="OCR Text"
            subtitle={preview(sourceText)}
            detail={<List.Item.Detail markdown={`## OCR Source\n\n${quoted(sourceText)}`} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={sourceText} title="Copy Source Text" />
                <Action
                  icon={Icon.TextCursor}
                  title="Edit in Translate"
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onAction={() =>
                    launchCommand({ name: "translate", type: LaunchType.UserInitiated, fallbackText: sourceText })
                  }
                />
                <Action
                  icon={Icon.Camera}
                  title="Retake Screenshot"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={() => void retake()}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {results.length > 0 && (
        <List.Section title="Translations">
          {results.map((r) => (
            <List.Item
              key={r.providerId}
              id={r.providerId}
              icon={{ source: PROVIDER_ICONS[r.providerId], tintColor: statusColor(r.status) }}
              title={r.providerTitle}
              subtitle={statusText(r)}
              accessories={acc(r, targetLangTitle)}
              detail={<List.Item.Detail markdown={md(r, sourceText)} />}
              actions={
                <ItemActions
                  result={r}
                  sourceText={sourceText}
                  tier={currentTier}
                  runtimeSettings={runtimeSettings}
                  allProviderIds={allProviderIds}
                  profile={currentProfile}
                  style={currentStyle}
                  onRetry={() => setManualRunId((v) => v + 1)}
                  onRetake={() => void retake()}
                  onTier={switchTier}
                  onProviderMode={switchProviderMode}
                  onProviderModel={switchProviderModel}
                  onProfile={switchProfile}
                  onStyle={switchStyle}
                  onTtsProvider={switchTtsProvider}
                  onTtsModel={switchTtsModel}
                />
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ItemActions(p: {
  result: TranslationResult;
  sourceText: string;
  tier: ModelTier;
  runtimeSettings: RuntimeSettings | undefined;
  allProviderIds: ProviderId[];
  profile: PromptProfile;
  style: TranslationStyle;
  onRetry: () => void;
  onRetake: () => void;
  onTier: (t: ModelTier) => void;
  onProviderMode: (mode: ProviderSelectionMode, providerId?: ProviderId) => void;
  onProviderModel: (providerId: ProviderId, model: string | undefined) => void;
  onProfile: (p: PromptProfile) => void;
  onStyle: (s: TranslationStyle) => void;
  onTtsProvider: (provider: TTSProvider) => void;
  onTtsModel: (model: string) => void;
}) {
  const ok = p.result.status === "success" && Boolean(p.result.translation);
  const ttsProvider = p.runtimeSettings?.ttsProvider ?? "qwen";
  const ttsModel = p.runtimeSettings?.ttsModel ?? getDefaultTTSModel(ttsProvider);
  const modelOverride = p.runtimeSettings?.modelOverrides[p.result.providerId];
  const providerMode = p.runtimeSettings?.providerMode ?? "enabled";

  function recordHistory() {
    if (!ok) return;
    void addHistoryEntry({
      kind: "translate",
      source: p.sourceText,
      output: p.result.translation ?? "",
      provider: p.result.providerTitle,
      model: p.result.modelName,
    });
  }

  return (
    <ActionPanel>
      {ok && (
        <ActionPanel.Section>
          <Action.CopyToClipboard
            content={p.result.translation ?? ""}
            title="Copy Translation"
            onCopy={recordHistory}
          />
          <Action.Paste
            content={p.result.translation ?? ""}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            title="Paste Translation"
            onPaste={recordHistory}
          />
          <Action
            icon={Icon.SpeakerOn}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            title="Read Translation Aloud"
            onAction={() => void speakText(p.result.translation ?? "")}
          />
          <Action
            icon={Icon.SpeakerOn}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            title="Read Source Aloud"
            onAction={() => void speakText(p.sourceText)}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Actions">
        <Action
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          title="Retry"
          onAction={p.onRetry}
        />
        <Action
          icon={Icon.Camera}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          title="Retake Screenshot"
          onAction={p.onRetake}
        />
        <Action.CopyToClipboard
          content={p.sourceText}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          title="Copy Source"
        />
        <Action
          icon={Icon.TextCursor}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          title="Edit in Translate"
          onAction={() =>
            launchCommand({ name: "translate", type: LaunchType.UserInitiated, fallbackText: p.sourceText })
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Submenu
        icon={Icon.Dot}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        title={providerMode === "single" ? `Provider: ${p.result.providerTitle}` : "Providers: All Enabled"}
      >
        <Action
          icon={providerMode === "enabled" ? Icon.Checkmark : Icon.Circle}
          title="All Enabled Providers"
          onAction={() => p.onProviderMode("enabled")}
        />
        {p.allProviderIds.map((id) => (
          <Action
            key={id}
            icon={
              providerMode === "single" && p.runtimeSettings?.selectedProviderId === id ? Icon.Checkmark : Icon.Circle
            }
            title={PROVIDER_TITLES[id]}
            onAction={() => p.onProviderMode("single", id)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu
        icon={Icon.Bolt}
        shortcut={{ modifiers: ["cmd"], key: "m" }}
        title={`Model: ${getTierLabel(p.tier)}`}
      >
        {(["fast", "pro", "custom"] as ModelTier[]).map((t) => (
          <Action
            key={t}
            icon={t === p.tier ? Icon.Checkmark : Icon.Circle}
            title={getTierLabel(t)}
            onAction={() => p.onTier(t)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu
        icon={Icon.MemoryChip}
        title={`Provider Model: ${p.result.modelName ?? getTierLabel(p.tier)}`}
      >
        <Action
          icon={!modelOverride ? Icon.Checkmark : Icon.Circle}
          title={`Use ${getTierLabel(p.tier)} Tier Default`}
          onAction={() => p.onProviderModel(p.result.providerId, undefined)}
        />
        {getModelOptions(p.result.providerId).map((model) => (
          <Action
            key={model.id}
            icon={modelOverride === model.id ? Icon.Checkmark : Icon.Circle}
            title={model.title}
            onAction={() => p.onProviderModel(p.result.providerId, model.id)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
        title={`Profile: ${PROMPT_PROFILE_LABELS[p.profile]}`}
      >
        {(Object.keys(PROMPT_PROFILE_LABELS) as PromptProfile[]).map((pr) => (
          <Action
            key={pr}
            icon={pr === p.profile ? Icon.Checkmark : Icon.Circle}
            title={PROMPT_PROFILE_LABELS[pr]}
            onAction={() => p.onProfile(pr)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu icon={Icon.SpeakerOn} title={`Voice Provider: ${TTS_PROVIDER_LABELS[ttsProvider]}`}>
        {(["qwen", "gemini"] as TTSProvider[]).map((provider) => (
          <Action
            key={provider}
            icon={provider === ttsProvider ? Icon.Checkmark : Icon.Circle}
            title={TTS_PROVIDER_LABELS[provider]}
            onAction={() => p.onTtsProvider(provider)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu icon={Icon.Waveform} title={`Voice Model: ${getTTSModelTitle(ttsProvider, ttsModel)}`}>
        {getTTSModelOptions(ttsProvider).map((model) => (
          <Action
            key={model.id}
            icon={model.id === ttsModel ? Icon.Checkmark : Icon.Circle}
            title={model.title}
            onAction={() => p.onTtsModel(model.id)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
        title={`Style: ${STYLE_LABELS[p.style]}`}
      >
        {(Object.keys(STYLE_LABELS) as TranslationStyle[]).map((s) => (
          <Action
            key={s}
            icon={s === p.style ? Icon.Checkmark : Icon.Circle}
            title={STYLE_LABELS[s]}
            onAction={() => p.onStyle(s)}
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
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function activateRaycast(): void {
  execFile("/usr/bin/osascript", ["-e", 'tell application "Raycast" to activate'], { timeout: 3000 }, () => undefined);
}

function preview(t: string): string {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length > 80 ? `${s.slice(0, 80)}...` : s;
}

function statusText(r: TranslationResult): string {
  if (r.status === "pending") return "Translating...";
  if (r.status === "missing-key") return "API key required";
  if (r.status === "error") return r.error ?? "Failed";
  return preview(r.translation ?? "");
}

function acc(r: TranslationResult, lang: string): List.Item.Accessory[] {
  const a: List.Item.Accessory[] = [];
  if (r.modelName) a.push({ tag: r.modelName });
  a.push({ text: lang });
  if (r.durationMs !== undefined && r.status !== "pending") a.push({ text: `${(r.durationMs / 1000).toFixed(1)}s` });
  return a;
}

function statusColor(s: TranslationResult["status"]): Color {
  if (s === "success") return Color.Green;
  if (s === "pending") return Color.Blue;
  return Color.Red;
}

function md(r: TranslationResult, src: string): string {
  const tag = r.modelName ? ` · \`${r.modelName}\`` : "";
  if (r.status === "pending") return `**${r.providerTitle}**${tag}\n\nTranslating...`;
  if (r.status === "missing-key")
    return `**${r.providerTitle}**${tag}\n\nAPI key not configured.\n\n---\n\n${quoted(src)}`;
  if (r.status === "error") return `**${r.providerTitle}**${tag}\n\n${r.error ?? "Failed."}\n\n---\n\n${quoted(src)}`;
  return `**${r.providerTitle}**${tag}\n\n## Translation\n\n${r.translation ?? ""}\n\n---\n\n**Source**\n\n${quoted(src)}`;
}
