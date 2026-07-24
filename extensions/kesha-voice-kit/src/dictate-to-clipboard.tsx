import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import {
  createDefaultDictationDeps,
  startDictationSession,
} from "./lib/dictation-controller";
import type {
  DictationSession,
  DictationState,
  DictationToast,
} from "./lib/dictation-types";
import {
  buildRecordingMarkdown,
  buildResultMarkdown,
  buildTranscribingMarkdown,
  formatDuration,
  formatInputFormat,
  recordingStatusLabel,
  recordingStatusTone,
  signalProgress,
} from "./lib/recording-view";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.DictateToClipboard>();
  const [state, setState] = useState<DictationState>({ status: "starting" });
  const sessionRef = useRef<DictationSession | null>(null);

  useEffect(() => {
    const session = startDictationSession(
      prefs,
      setState,
      createDefaultDictationDeps({
        copyToClipboard: (text) => Clipboard.copy(text),
        showToast: showRaycastToast,
      }),
    );
    sessionRef.current = session;
    void session.done;

    return () => {
      session.cancel();
      sessionRef.current = null;
    };
  }, []);

  if (state.status === "starting") {
    return <Detail isLoading markdown="Preparing microphone..." />;
  }

  if (state.status === "recording") {
    return (
      <Detail
        markdown={buildRecordingMarkdown(state)}
        metadata={<RecordingMetadata state={state} />}
        actions={
          <ActionPanel>
            <Action
              title="Stop and Transcribe"
              icon={Icon.Stop}
              onAction={() => sessionRef.current?.stopRecording()}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state.status === "stopping") {
    return <Detail isLoading markdown="Stopping recording..." />;
  }

  if (state.status === "transcribing") {
    return (
      <Detail
        isLoading
        markdown={buildTranscribingMarkdown(state)}
        metadata={<TranscribingMetadata state={state} />}
        actions={
          <ActionPanel>
            <Action
              title="Cancel Transcription"
              icon={Icon.XmarkCircle}
              style={Action.Style.Destructive}
              onAction={() => sessionRef.current?.cancelTranscription()}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state.status === "error") {
    const body = state.hint
      ? `${state.message}\n\n${state.hint}`
      : state.message;
    return <Detail markdown={`# Error\n\n${body}`} />;
  }

  return (
    <Detail
      markdown={buildResultMarkdown(state.result.text)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Transcript"
            content={state.result.text}
          />
        </ActionPanel>
      }
    />
  );
}

function RecordingMetadata({
  state,
}: {
  state: Extract<DictationState, { status: "recording" }>;
}) {
  const inputFormat = formatInputFormat(state.mic);
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Microphone"
        text={state.mic.name}
        icon={Icon.Microphone}
      />
      {inputFormat ? (
        <Detail.Metadata.Label
          title="Input Format"
          text={inputFormat}
          icon={Icon.FullSignal}
        />
      ) : null}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Signal"
        text={`${state.signal.percent}%`}
        icon={getProgressIcon(signalProgress(state.signal), Color.Green)}
      />
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item
          text={recordingStatusLabel(state)}
          color={raycastToneColor(recordingStatusTone(state))}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label
        title="Elapsed"
        text={formatDuration(state.elapsedSeconds)}
        icon={Icon.Clock}
      />
    </Detail.Metadata>
  );
}

function TranscribingMetadata({
  state,
}: {
  state: Extract<DictationState, { status: "transcribing" }>;
}) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Elapsed"
        text={formatDuration(state.elapsedSeconds)}
        icon={getProgressIcon(
          Math.min(1, state.elapsedSeconds / state.timeoutSeconds),
          Color.Blue,
        )}
      />
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item
          text="Local Processing"
          color={Color.Blue}
        />
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}

function raycastToneColor(
  tone: ReturnType<typeof recordingStatusTone>,
): Color | undefined {
  switch (tone) {
    case "green":
      return Color.Green;
    case "blue":
      return Color.Blue;
    case "orange":
      return Color.Orange;
    case "secondary":
      return undefined;
  }
}

function showRaycastToast(toast: DictationToast): Promise<void> {
  return showToast({
    style: raycastToastStyle(toast.style),
    title: toast.title,
    message: toast.message,
  }).then(() => undefined);
}

function raycastToastStyle(style: DictationToast["style"]): Toast.Style {
  switch (style) {
    case "animated":
      return Toast.Style.Animated;
    case "success":
      return Toast.Style.Success;
    case "failure":
      return Toast.Style.Failure;
  }
}
