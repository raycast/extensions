import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  LaunchProps,
  Toast,
  getSelectedText,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { addHistoryEntry } from "./history-store";
import {
  PROVIDER_TITLES,
  getMaxOutputTokens,
  getOrderedProviderIds,
  getProviderConfig,
  getTimeoutMs,
  readPreferences,
} from "./preferences";
import { MissingAPIKeyError } from "./providers";
import { REWRITE_TONE_LABELS, RewriteResult, runRewrite } from "./rewrite";
import { getDefaultRuntimeSettings, loadRuntimeSettings, updateRuntimeSettings } from "./runtime-settings";
import { speakText } from "./tts";
import { getModelOptions, getModelTitle } from "./models";
import { getDefaultTTSModel, getTTSModelOptions, getTTSModelTitle, TTS_PROVIDER_LABELS } from "./tts-models";
import { ExtensionPreferences, ProviderId, RewriteTone, RuntimeSettings, TTSProvider } from "./types";
import { normalizeInputText, quoted } from "./ui-constants";

const TONE_ORDER: RewriteTone[] = ["natural", "casual", "formal", "concise"];

export default function Command(props: LaunchProps) {
  const preferences = useMemo(() => readPreferences(), []);
  const providerIds = useMemo(() => getOrderedProviderIds(preferences), [preferences]);
  const [seed, setSeed] = useState<string>();
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>();

  useEffect(() => {
    let isMounted = true;

    async function setup() {
      const launchText = normalizeInputText(props.fallbackText ?? "");
      if (launchText) {
        if (isMounted) setSeed(launchText);
        return;
      }
      let resolved = "";
      try {
        resolved = normalizeInputText(await getSelectedText());
      } catch {
        resolved = "";
      }
      if (!resolved) {
        try {
          resolved = normalizeInputText((await Clipboard.readText()) ?? "");
        } catch {
          resolved = "";
        }
      }
      if (isMounted) setSeed(resolved);
    }

    void setup();
    return () => {
      isMounted = false;
    };
  }, [props.fallbackText]);

  useEffect(() => {
    let isMounted = true;
    void loadRuntimeSettings().then((settings) => {
      if (isMounted) setRuntimeSettings(settings);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (seed === undefined || !runtimeSettings) {
    return <Detail isLoading navigationTitle="Rewrite & Coach" markdown="Reading selected text…" />;
  }

  const initialProviderId =
    runtimeSettings.providerMode === "single" &&
    runtimeSettings.selectedProviderId &&
    providerIds.includes(runtimeSettings.selectedProviderId)
      ? runtimeSettings.selectedProviderId
      : providerIds[0];

  if (!seed) {
    return (
      <CoachForm
        preferences={preferences}
        providerIds={providerIds}
        initialText=""
        initialProviderId={initialProviderId}
      />
    );
  }

  return (
    <CoachResult
      preferences={preferences}
      providerIds={providerIds}
      text={seed}
      initialProviderId={initialProviderId}
      initialRuntimeSettings={runtimeSettings}
    />
  );
}

function CoachForm({
  preferences,
  providerIds,
  initialText,
  initialTone = "natural",
  initialProviderId,
}: {
  preferences: ExtensionPreferences;
  providerIds: ProviderId[];
  initialText: string;
  initialTone?: RewriteTone;
  initialProviderId?: ProviderId;
}) {
  const { push } = useNavigation();

  function handleSubmit(values: { text: string; tone: string; provider: string }) {
    const text = normalizeInputText(values.text);
    if (!text) {
      void showToast({ style: Toast.Style.Failure, title: "Enter text to rewrite" });
      return;
    }
    push(
      <CoachResult
        preferences={preferences}
        providerIds={providerIds}
        text={text}
        initialTone={values.tone as RewriteTone}
        initialProviderId={values.provider as ProviderId}
      />,
    );
  }

  return (
    <Form
      navigationTitle="Rewrite & Coach"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Wand} title="Rewrite & Coach" onSubmit={handleSubmit} />
          <Action icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Type or paste text to rewrite into natural English…"
        defaultValue={initialText}
      />
      <Form.Dropdown id="tone" title="Tone" defaultValue={initialTone}>
        {TONE_ORDER.map((tone) => (
          <Form.Dropdown.Item key={tone} value={tone} title={REWRITE_TONE_LABELS[tone]} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="provider" title="Provider" defaultValue={initialProviderId ?? providerIds[0]}>
        {providerIds.map((id) => (
          <Form.Dropdown.Item key={id} value={id} title={PROVIDER_TITLES[id]} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function CoachResult({
  preferences,
  providerIds,
  text,
  initialTone = "natural",
  initialProviderId,
  initialRuntimeSettings,
}: {
  preferences: ExtensionPreferences;
  providerIds: ProviderId[];
  text: string;
  initialTone?: RewriteTone;
  initialProviderId?: ProviderId;
  initialRuntimeSettings?: RuntimeSettings;
}) {
  const { push } = useNavigation();
  const [tone, setTone] = useState<RewriteTone>(initialTone);
  const [providerId, setProviderId] = useState<ProviderId>(initialProviderId ?? providerIds[0]);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>(
    initialRuntimeSettings ?? getDefaultRuntimeSettings(),
  );
  const [result, setResult] = useState<RewriteResult>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [runId, setRunId] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    let isMounted = true;
    void loadRuntimeSettings().then((settings) => {
      if (isMounted) setRuntimeSettings(settings);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function switchTtsProvider(next: TTSProvider) {
    const updated = await updateRuntimeSettings({ ttsProvider: next, ttsModel: getDefaultTTSModel(next, preferences) });
    setRuntimeSettings(updated);
    await showToast({ style: Toast.Style.Success, title: `Read Aloud: ${TTS_PROVIDER_LABELS[next]}` });
  }

  async function switchTtsModel(model: string) {
    const updated = await updateRuntimeSettings({ ttsModel: model });
    setRuntimeSettings(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Voice model selected",
      message: getTTSModelTitle(updated.ttsProvider, model),
    });
  }

  async function switchRewriteProvider(id: ProviderId) {
    const updated = await updateRuntimeSettings({ providerMode: "single", selectedProviderId: id });
    setRuntimeSettings(updated);
    setProviderId(id);
    await showToast({ style: Toast.Style.Success, title: `Rewrite Provider: ${PROVIDER_TITLES[id]}` });
  }

  async function switchRewriteModel(model: string | undefined) {
    const overrides = { ...runtimeSettings.modelOverrides };
    if (model) {
      overrides[providerId] = model;
    } else {
      delete overrides[providerId];
    }
    const updated = await updateRuntimeSettings({ modelOverrides: overrides });
    setRuntimeSettings(updated);
    await showToast({
      style: Toast.Style.Success,
      title: model ? `${PROVIDER_TITLES[providerId]} model selected` : `${PROVIDER_TITLES[providerId]} uses Pro`,
      message: model ? getModelTitle(providerId, model) : undefined,
    });
  }

  const rewritten = result?.rewritten ?? "";
  const providerTitle = PROVIDER_TITLES[providerId];
  const providerModelOverride = runtimeSettings.modelOverrides[providerId];
  const ttsProvider = runtimeSettings.ttsProvider;
  const ttsModel = runtimeSettings.ttsModel ?? getDefaultTTSModel(ttsProvider, preferences);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setError(undefined);

    async function run() {
      // Pro tier is intentional: Rewrite & Coach is locked here (and in
      // rewrite-replace) so rewrite quality stays consistent regardless of
      // the translation Model Tier the user picked. Free-tier keys should
      // override the Pro model via the Custom tier in Extension Preferences.
      const config = getProviderConfig(providerId, preferences, "pro", providerModelOverride);
      try {
        const rewrite = await runRewrite(
          config,
          text,
          tone,
          getTimeoutMs(preferences),
          getMaxOutputTokens(preferences),
        );
        if (sequence !== requestSequence.current) return;
        setResult(rewrite);
      } catch (caught) {
        if (sequence !== requestSequence.current) return;
        const message =
          caught instanceof MissingAPIKeyError
            ? `Add a ${config.title} API key in Extension Preferences.`
            : caught instanceof Error
              ? caught.message
              : String(caught);
        setResult(undefined);
        setError(message);
        await showToast({ style: Toast.Style.Failure, title: "Rewrite failed", message: message.slice(0, 120) });
      } finally {
        if (sequence === requestSequence.current) setIsLoading(false);
      }
    }

    void run();
  }, [text, tone, providerId, runId, preferences, providerModelOverride]);

  function recordHistory() {
    if (!rewritten) return;
    const model = getProviderConfig(providerId, preferences, "pro", providerModelOverride).model;
    void addHistoryEntry({ kind: "rewrite", source: text, output: rewritten, provider: providerTitle, model });
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Rewrite & Coach · ${REWRITE_TONE_LABELS[tone]} · ${providerTitle}`}
      markdown={buildMarkdown({ original: text, result, error, isLoading })}
      actions={
        <ActionPanel>
          {rewritten && (
            <ActionPanel.Section>
              <Action.Paste
                content={rewritten}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                title="Paste Rewritten Text"
                onPaste={recordHistory}
              />
              <Action.CopyToClipboard content={rewritten} title="Copy Rewritten Text" onCopy={recordHistory} />
              <Action
                icon={Icon.SpeakerOn}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                title="Read Rewritten Aloud"
                onAction={() => void speakText(rewritten)}
              />
              <Action
                icon={Icon.SpeakerOn}
                shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
                title="Read Rewritten Slowly"
                onAction={() => void speakText(rewritten, { slow: true })}
              />
              <Action
                icon={Icon.SpeakerOn}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                title="Read Original Aloud"
                onAction={() => void speakText(text)}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              title="Regenerate"
              onAction={() => setRunId((value) => value + 1)}
            />
            <Action
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              title="Edit Input"
              onAction={() =>
                push(
                  <CoachForm
                    preferences={preferences}
                    providerIds={providerIds}
                    initialText={text}
                    initialTone={tone}
                    initialProviderId={providerId}
                  />,
                )
              }
            />
            <Action.CopyToClipboard
              content={text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              title="Copy Original Text"
            />
          </ActionPanel.Section>
          <ActionPanel.Submenu
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            title={`Tone: ${REWRITE_TONE_LABELS[tone]}`}
          >
            {TONE_ORDER.map((option) => (
              <Action
                key={option}
                icon={option === tone ? Icon.Checkmark : Icon.Circle}
                title={REWRITE_TONE_LABELS[option]}
                onAction={() => setTone(option)}
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Submenu
            icon={Icon.Bolt}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            title={`Rewrite Provider: ${providerTitle}`}
          >
            {providerIds.map((id) => (
              <Action
                key={id}
                icon={id === providerId ? Icon.Checkmark : Icon.Circle}
                title={PROVIDER_TITLES[id]}
                onAction={() => void switchRewriteProvider(id)}
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Submenu
            icon={Icon.MemoryChip}
            title={`Rewrite Model: ${
              providerModelOverride ? getModelTitle(providerId, providerModelOverride) : "Pro Tier Default"
            }`}
          >
            <Action
              icon={!providerModelOverride ? Icon.Checkmark : Icon.Circle}
              title="Use Pro Tier Default"
              onAction={() => void switchRewriteModel(undefined)}
            />
            {getModelOptions(providerId).map((model) => (
              <Action
                key={model.id}
                icon={providerModelOverride === model.id ? Icon.Checkmark : Icon.Circle}
                title={model.title}
                onAction={() => void switchRewriteModel(model.id)}
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Submenu
            icon={Icon.SpeakerOn}
            shortcut={{ modifiers: ["cmd", "opt"], key: "m" }}
            title={`Read Aloud: ${TTS_PROVIDER_LABELS[ttsProvider]}`}
          >
            {(["qwen", "gemini"] as TTSProvider[]).map((option) => (
              <Action
                key={option}
                icon={option === ttsProvider ? Icon.Checkmark : Icon.Circle}
                title={TTS_PROVIDER_LABELS[option]}
                onAction={() => void switchTtsProvider(option)}
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Submenu icon={Icon.Waveform} title={`Voice Model: ${getTTSModelTitle(ttsProvider, ttsModel)}`}>
            {getTTSModelOptions(ttsProvider).map((model) => (
              <Action
                key={model.id}
                icon={model.id === ttsModel ? Icon.Checkmark : Icon.Circle}
                title={model.title}
                onAction={() => void switchTtsModel(model.id)}
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Section title="Settings">
            <Action icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
            {error ? (
              <Action
                icon={Icon.ExclamationMark}
                title="Show Error"
                onAction={() => showToast({ style: Toast.Style.Failure, title: "Rewrite & Coach", message: error })}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(state: {
  original: string;
  result: RewriteResult | undefined;
  error: string | undefined;
  isLoading: boolean;
}): string {
  const { original, result, error, isLoading } = state;
  const sections: string[] = [];

  if (result?.rewritten) {
    sections.push("## ✨ Rewritten", "", result.rewritten);
  } else if (isLoading) {
    sections.push("## ✨ Rewritten", "", "_Rewriting and coaching…_");
  } else if (error) {
    sections.push("## ⚠️ Error", "", error);
  }

  sections.push("", "## 📝 Original", "", quoted(original));

  if (result?.why) {
    sections.push("", "## 💡 为什么这样更自然", "", result.why);
  }

  return sections.join("\n");
}
