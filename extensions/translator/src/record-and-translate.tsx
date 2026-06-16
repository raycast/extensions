import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatRecordingDuration, removeAudioFile } from "./audio";
import { translateText, type TranslationTarget } from "./openai-compatible";
import { transcribeAudioFile, TRANSCRIPTION_MODEL } from "./transcription";
import { deliverTranslation, TranslationDeliveryError } from "./translation-delivery";
import { enabledTranslationOptions, translationTargetTitle } from "./translation-options";
import { useAudioRecorder } from "./use-audio-recorder";

type VoiceStage = "starting" | "recording" | "transcribing" | "choosing" | "translating" | "error";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.RecordAndTranslate>();
  const {
    isRecording,
    duration,
    error: recorderError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();
  const [stage, setStage] = useState<VoiceStage>("starting");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastTarget, setLastTarget] = useState<TranslationTarget>();
  const didAutoStart = useRef(false);
  const operationInFlight = useRef(false);
  const translationOptions = enabledTranslationOptions(preferences);

  const beginRecording = useCallback(async () => {
    if (operationInFlight.current) {
      return;
    }

    operationInFlight.current = true;
    setStage("starting");
    setTranscript("");
    setErrorMessage("");
    setLastTarget(undefined);

    try {
      await startRecording();
      setStage("recording");
    } catch (error) {
      setErrorMessage(errorMessageFor(error));
      setStage("error");
    } finally {
      operationInFlight.current = false;
    }
  }, [startRecording]);

  useEffect(() => {
    if (translationOptions.length === 0 || didAutoStart.current) {
      return;
    }

    didAutoStart.current = true;
    void beginRecording();
  }, [beginRecording, translationOptions.length]);

  useEffect(() => {
    if (!recorderError) {
      return;
    }

    setErrorMessage(recorderError);
    setStage("error");
  }, [recorderError]);

  async function stopAndTranscribe() {
    if (!isRecording || operationInFlight.current) {
      return;
    }

    operationInFlight.current = true;
    setStage("transcribing");
    let filePath: string | undefined;

    try {
      filePath = await stopRecording();
      const recognizedText = await transcribeAudioFile(filePath, preferences);
      setTranscript(recognizedText);
      setStage("choosing");
    } catch (error) {
      setErrorMessage(errorMessageFor(error));
      setStage("error");
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Transcribe",
        message: errorMessageFor(error),
      });
    } finally {
      if (filePath) {
        await removeAudioFile(filePath);
      }
      operationInFlight.current = false;
    }
  }

  async function translateAndInsert(target: TranslationTarget) {
    if (!transcript || operationInFlight.current) {
      return;
    }

    operationInFlight.current = true;
    setLastTarget(target);
    setStage("translating");

    try {
      const translatedText = await translateText(transcript, target, preferences);
      await deliverTranslation({
        sourceText: transcript,
        translatedText,
        target,
        model: preferences.model.trim(),
      });
    } catch (error) {
      setErrorMessage(errorMessageFor(error));
      setStage("error");
      await showToast({
        style: Toast.Style.Failure,
        title: error instanceof TranslationDeliveryError ? "Translation Could Not Be Delivered" : "Could Not Translate",
        message: errorMessageFor(error),
      });
    } finally {
      operationInFlight.current = false;
    }
  }

  async function cancelAndClose() {
    try {
      await cancelRecording();
    } finally {
      await popToRoot();
    }
  }

  if (translationOptions.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Globe}
          title="No Target Languages Enabled"
          description="Select at least one target language in the extension preferences."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (stage === "choosing") {
    return (
      <List isShowingDetail searchBarPlaceholder="Choose the target language...">
        <List.Section title="Target Language" subtitle="Transcription complete">
          {translationOptions.map((option) => (
            <List.Item
              key={option.target.id}
              icon={option.icon}
              title={option.title}
              subtitle="Translate and paste into the active app"
              keywords={option.keywords}
              detail={
                <List.Item.Detail
                  markdown={transcriptPreview(transcript)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Transcription"
                        text={TRANSCRIPTION_MODEL}
                        icon={Icon.Microphone}
                      />
                      <List.Item.Detail.Metadata.Label title="Target" text={option.title} icon={option.icon} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={`Translate to ${option.title}`}
                    icon={Icon.ArrowRight}
                    onAction={() => void translateAndInsert(option.target)}
                  />
                  <Action.CopyToClipboard title="Copy Transcription" content={transcript} icon={Icon.Clipboard} />
                  <Action title="Record Again" icon={Icon.Microphone} onAction={() => void beginRecording()} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  if (stage === "error") {
    return (
      <List>
        <List.Item
          icon={Icon.XMarkCircle}
          title="The Workflow Was Interrupted"
          subtitle={errorMessage}
          actions={
            <ActionPanel>
              {transcript && lastTarget ? (
                <Action
                  title={`Try ${translationTargetTitle(lastTarget)} Again`}
                  icon={Icon.ArrowClockwise}
                  onAction={() => void translateAndInsert(lastTarget)}
                />
              ) : null}
              {transcript ? (
                <Action title="Choose Another Language" icon={Icon.Globe} onAction={() => setStage("choosing")} />
              ) : null}
              {transcript ? (
                <Action.CopyToClipboard title="Copy Transcription" content={transcript} icon={Icon.Clipboard} />
              ) : null}
              <Action title="Record Again" icon={Icon.Microphone} onAction={() => void beginRecording()} />
              <Action
                title="Cancel"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                onAction={() => void cancelAndClose()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (stage === "recording") {
    return (
      <List filtering={false} searchBarPlaceholder={`Recording ${formatRecordingDuration(duration)}`}>
        <List.Item
          icon={Icon.Stop}
          title="Stop Recording"
          subtitle={`Transcribe with ${TRANSCRIPTION_MODEL}, then choose a language`}
          accessories={[{ text: formatRecordingDuration(duration) }]}
          actions={
            <ActionPanel>
              <Action title="Transcribe Recording" icon={Icon.Stop} onAction={() => void stopAndTranscribe()} />
              <Action
                title="Cancel Recording"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                onAction={() => void cancelAndClose()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const isTranslating = stage === "translating";
  return (
    <List isLoading>
      <List.EmptyView
        icon={isTranslating ? Icon.Globe : stage === "transcribing" ? Icon.Waveform : Icon.Microphone}
        title={isTranslating ? `Translating to ${translationTargetTitle(lastTarget)}...` : processingTitle(stage)}
        description={
          isTranslating
            ? "The translation will be pasted into the active app."
            : stage === "transcribing"
              ? `Processing audio with ${TRANSCRIPTION_MODEL}.`
              : "Preparing the microphone..."
        }
      />
    </List>
  );
}

function transcriptPreview(transcript: string): string {
  return ["## Recognized Text", "", escapeMarkdown(transcript)].join("\n");
}

function processingTitle(stage: VoiceStage): string {
  if (stage === "transcribing") {
    return "Transcribing...";
  }

  return "Preparing Recording...";
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]<>()#+\-.!|])/g, "\\$1");
}

function errorMessageFor(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
}
