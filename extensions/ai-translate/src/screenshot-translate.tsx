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
import { getTierLabel } from "./models";
import { recognizeScreenshotText } from "./ocr-engines";
import { openScreenRecordingSettings, reportOcrError } from "./ocr-errors";
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

    const providerIds = getOrderedProviderIds(preferences);
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
        const config = getProviderConfig(providerId, preferences, runtimeSettings.modelTier);
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
    setRuntimeSettings(await updateRuntimeSetting("modelTier", tier));
    await showToast({ style: Toast.Style.Success, title: `Model: ${getTierLabel(tier)}` });
  }
  async function switchProfile(profile: PromptProfile) {
    setRuntimeSettings(await updateRuntimeSetting("promptProfile", profile));
    await showToast({ style: Toast.Style.Success, title: `Profile: ${PROMPT_PROFILE_LABELS[profile]}` });
  }
  async function switchStyle(style: TranslationStyle) {
    setRuntimeSettings(await updateRuntimeSetting("translationStyle", style));
    await showToast({ style: Toast.Style.Success, title: `Style: ${STYLE_LABELS[style]}` });
  }

  const currentTier = runtimeSettings?.modelTier ?? "fast";
  const currentProfile = runtimeSettings?.promptProfile ?? "screenshot";
  const currentStyle = runtimeSettings?.translationStyle ?? "balanced";
  const targetLangTitle = getLanguageTitle(resolveTargetLanguage(targetLanguage, sourceText));

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={ocrDone && results.length > 0}
      navigationTitle={`Screenshot Translate · ${getTierLabel(currentTier)}`}
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
                  profile={currentProfile}
                  style={currentStyle}
                  onRetry={() => setManualRunId((v) => v + 1)}
                  onRetake={() => void retake()}
                  onTier={switchTier}
                  onProfile={switchProfile}
                  onStyle={switchStyle}
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
  profile: PromptProfile;
  style: TranslationStyle;
  onRetry: () => void;
  onRetake: () => void;
  onTier: (t: ModelTier) => void;
  onProfile: (p: PromptProfile) => void;
  onStyle: (s: TranslationStyle) => void;
}) {
  const ok = p.result.status === "success" && Boolean(p.result.translation);

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
