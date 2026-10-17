import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  openCommandPreferences,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { writeFile } from "fs/promises";
import {
  AUDIO_TYPES,
  FormValues,
  HistoryEntry,
  isAudioType,
  isOutputFormat,
  OutputFormat,
  OUTPUT_FORMATS,
  Provider,
  PROVIDERS,
  TranscriptionResult,
} from "./types";
import { getTranscribePreferences, hasApiKey } from "./preferences";
import { cleanupFile, isSupportedMediaFile, prepareUploadFile } from "./utils/audio";
import {
  escapeMarkdown,
  formatForOutput,
  formatTranscription,
  hasTimedSegments,
  outputExtension,
} from "./utils/format";
import { uniqueSiblingPath } from "./utils/files";
import { addHistoryEntry } from "./utils/history";
import { transcribe } from "./providers";

interface TranscriptionCommandProps {
  initialValues?: Partial<FormValues>;
}

export default function TranscribeCommand({ initialValues }: TranscriptionCommandProps) {
  const { push } = useNavigation();
  const submitLockedRef = useRef(false);

  const prefs = getTranscribePreferences();
  const provider = getConfiguredProvider(prefs);
  const setupNeeded = !provider || !hasApiKey(provider, prefs);
  const unlockSubmit = useCallback(() => {
    submitLockedRef.current = false;
  }, []);

  if (setupNeeded) {
    return (
      <Detail
        navigationTitle="Setup Required"
        markdown={`# Configure Transcription Provider\n\nChoose a provider and enter its API key in the command preferences. You can change this at any time in Raycast settings.`}
        actions={
          <ActionPanel>
            <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const defaultAudioType = AUDIO_TYPES.find((t) => t.value === prefs.defaultAudioType) || AUDIO_TYPES[0];
  const providerConfig = PROVIDERS.find((p) => p.value === provider) || PROVIDERS[0];

  const handleSubmit = (values: FormValues) => {
    if (submitLockedRef.current) return;

    const filePath = values.files?.[0];
    if (!filePath) {
      showToast({
        style: Toast.Style.Failure,
        title: "Select a file",
        message: "Use the file picker to choose an audio or video file.",
      });
      return;
    }

    if (!isSupportedMediaFile(filePath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Unsupported file type",
        message: "Choose a supported audio or video file.",
      });
      return;
    }

    submitLockedRef.current = true;

    const audioTypeConfig = AUDIO_TYPES.find((t) => t.value === values.audioType) || defaultAudioType;
    const outputFormat: OutputFormat = isOutputFormat(values.outputFormat) ? values.outputFormat : "markdown";
    const diarization = providerConfig.supportsDiarization && values.diarization;

    try {
      push(
        <TranscriptionView
          filePath={filePath}
          provider={provider}
          audioType={values.audioType}
          diarization={diarization}
          language={values.language}
          audioTypeTitle={audioTypeConfig.title}
          outputFormat={outputFormat}
          initialValues={values}
          onExit={unlockSubmit}
        />,
      );
    } catch (error) {
      unlockSubmit();
      throw error;
    }
  };

  return (
    <Form
      navigationTitle="Transcribe Audio"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transcribe" onSubmit={handleSubmit} icon={Icon.Play} />
          <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Audio or Video File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={initialValues?.files}
      />

      <Form.Dropdown
        id="audioType"
        title="Audio Type"
        defaultValue={defaultAudioType.value}
        value={initialValues?.audioType}
      >
        {AUDIO_TYPES.map((type) => (
          <Form.Dropdown.Item key={type.value} value={type.value} title={`${type.title} — ${type.description}`} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="outputFormat"
        title="Output Format"
        defaultValue="markdown"
        value={initialValues?.outputFormat}
      >
        {OUTPUT_FORMATS.filter((format) => format.value !== "srt" || provider !== "openai").map((format) => (
          <Form.Dropdown.Item key={format.value} value={format.value} title={format.title} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="diarization"
        title="Speaker Labels"
        label="Label each speaker in the transcript"
        defaultValue={defaultAudioType.enableDiarizationByDefault}
        value={initialValues?.diarization}
      />

      <Form.TextField
        id="language"
        title="Language"
        placeholder="auto"
        defaultValue={prefs.language || ""}
        value={initialValues?.language}
      />
    </Form>
  );
}

function getConfiguredProvider(prefs: { defaultProvider?: string }): Provider | undefined {
  const value = prefs.defaultProvider;
  if (!value) return undefined;
  const match = PROVIDERS.find((p) => p.value === value);
  return match ? (match.value as Provider) : undefined;
}

interface TranscriptionViewProps {
  filePath: string;
  provider: Provider;
  audioType: string;
  diarization: boolean;
  language: string;
  audioTypeTitle: string;
  outputFormat: OutputFormat;
  initialValues: FormValues;
  onExit: () => void;
}

function TranscriptionView({
  filePath,
  provider,
  audioType,
  diarization,
  language,
  audioTypeTitle,
  outputFormat,
  initialValues,
  onExit,
}: TranscriptionViewProps) {
  const { push } = useNavigation();
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Preparing upload…");
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fileName = filePath.split("/").pop() || filePath;

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let uploadFile: { path: string; isTemporary: boolean; tempDir?: string } | undefined;

    (async () => {
      try {
        const normalizedAudioType = isAudioType(audioType) ? audioType : "voice-note";

        setStatus("Checking file…");
        uploadFile = await prepareUploadFile(filePath, provider, setStatus, controller.signal);
        if (controller.signal.aborted) return;

        setStatus("Uploading and transcribing…");
        const transcription = await transcribe({
          filePath: uploadFile?.path ?? filePath,
          provider,
          audioType: normalizedAudioType,
          diarization,
          language: language.trim() || undefined,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        await saveToHistory(filePath, provider, audioType, language, transcription);
        setResult(transcription);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (uploadFile?.isTemporary) {
          cleanupFile(uploadFile.path).catch(() => undefined);
          cleanupFile(uploadFile.tempDir).catch(() => undefined);
        }
        abortControllerRef.current = null;
      }
    })();

    return () => {
      controller.abort();
      onExit();
    };
  }, [filePath, provider, audioType, diarization, language, onExit]);

  const handleSave = async (text: string, format: OutputFormat) => {
    const targetPath = await uniqueSiblingPath(filePath, ` - Transcript${outputExtension(format)}`);
    try {
      await writeFile(targetPath, text, "utf-8");
      setSavedPath(targetPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Saved transcript",
        message: targetPath,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save transcript",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${escapeMarkdown(error)}`}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.RotateClockwise}
              onAction={() => push(<TranscribeCommand initialValues={initialValues} />)}
            />
            <Action
              title="Back"
              icon={Icon.ArrowLeft}
              onAction={() => push(<TranscribeCommand initialValues={initialValues} />)}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!result) {
    return <Detail navigationTitle={fileName} markdown={`# Transcribing…\n\n${escapeMarkdown(status)}`} />;
  }

  const formatted = formatTranscription(result, false, diarization);
  const srtAvailable = hasTimedSegments(result);
  const effectiveOutputFormat = outputFormat === "srt" && !srtAvailable ? "plain" : outputFormat;
  const outputText = formatForOutput(result, effectiveOutputFormat, diarization);
  const markdownBody = effectiveOutputFormat === "markdown" ? formatted.markdown : escapeMarkdown(outputText);

  const durationLabel = formatDuration(result.duration);
  const metaLine = [
    `**File:** ${escapeMarkdown(fileName)}`,
    `**Provider:** ${provider}`,
    `**Audio:** ${audioTypeTitle}`,
    durationLabel ? `**Duration:** ${durationLabel}` : undefined,
    `**Speakers:** ${diarization ? "labeled" : "off"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const markdown = `# Transcript\n\n${metaLine}\n\n---\n\n${markdownBody}`;

  return (
    <Detail
      navigationTitle={fileName}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Result"
            content={outputText}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Save as File"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => handleSave(outputText, effectiveOutputFormat)}
          />
          <Action.CopyToClipboard title="Copy Plain Text" content={formatted.plainText} />
          {srtAvailable && <Action.CopyToClipboard title="Copy SRT" content={formatted.srt || ""} />}
          <Action
            title="Save as Markdown"
            icon={Icon.Document}
            onAction={() => handleSave(formatted.markdown, "markdown")}
          />
          <Action
            title="Save as Plain Text"
            icon={Icon.Document}
            onAction={() => handleSave(formatted.plainText, "plain")}
          />
          {srtAvailable && (
            <Action title="Save as SRT" icon={Icon.Document} onAction={() => handleSave(formatted.srt || "", "srt")} />
          )}
          {savedPath && (
            <Action title="Show Saved File in Finder" icon={Icon.Finder} onAction={() => showInFinder(savedPath)} />
          )}
          <Action title="Transcribe Another File" icon={Icon.Plus} onAction={() => push(<TranscribeCommand />)} />
        </ActionPanel>
      }
    />
  );
}

function formatDuration(seconds?: number): string | undefined {
  if (seconds === undefined || isNaN(seconds)) return undefined;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

async function saveToHistory(
  filePath: string,
  provider: Provider,
  audioType: string,
  language: string,
  result: TranscriptionResult,
): Promise<void> {
  try {
    const prefs = getTranscribePreferences();
    if (prefs.historyEnabled === false) return;

    const retentionDays = parseInt(prefs.historyRetentionDays || "30", 10);
    const maxEntries = parseInt(prefs.historyMaxEntries || "50", 10);

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      filePath,
      provider,
      audioType,
      language: language.trim() || undefined,
      text: result.text,
      segments: result.segments,
      duration: result.duration,
      diarization: result.segments?.some((segment) => Boolean(segment.speaker)) ?? false,
    };

    await addHistoryEntry(entry, maxEntries, retentionDays);
  } catch {
    // History failures should not break the transcription flow.
  }
}
