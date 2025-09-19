import { Action, ActionPanel, Detail, Form, Keyboard, Clipboard, popToRoot } from "@raycast/api";
import { useCallback } from "react";
import { useTranscriptionActions, useTranscriptionState } from "./store/transcription.store";
import {
  useAutoStart,
  useEnvironmentGate,
  useTranscriptionToasts,
  useWaveformAnimation,
  useTranscribeSpinner,
} from "./hooks/transcribe";

export default function Command() {
  const state = useTranscriptionState();
  const { startRecording, stopAndTranscribe, retryTranscription, cancelRecording, reset } = useTranscriptionActions();

  const { checkState: systemCheckState, result: guardResult } = useEnvironmentGate();
  useTranscriptionToasts(state.status, state.error);

  const { suppressAutoStart, allowAutoStart } = useAutoStart({
    status: state.status,
    systemReady: systemCheckState.status === "ok" && !guardResult.hasError,
    startRecording,
  });
  const waveformMarkdown = useWaveformAnimation(state.status === "recording");
  const spinnerMarkdown = useTranscribeSpinner(state.status === "transcribing");

  const handleCancel = useCallback(() => {
    void cancelRecording();
    suppressAutoStart();
  }, [cancelRecording, suppressAutoStart]);

  const handleReset = useCallback(() => {
    allowAutoStart();
    reset();
  }, [allowAutoStart, reset]);

  if (guardResult.hasError) {
    const actions =
      guardResult.action && guardResult.actionHandler ? (
        <ActionPanel>
          <Action title={guardResult.action} onAction={guardResult.actionHandler} />
        </ActionPanel>
      ) : undefined;

    return (
      <Detail
        markdown={`## ${guardResult.title}\n\n${guardResult.message}\n\n**Solution:** ${guardResult.solution}`}
        actions={actions}
      />
    );
  }

  if (state.status === "transcribing_success" && state.transcript !== undefined) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Paste Edited Transcript"
              onSubmit={async (values: { transcript?: string }) => {
                const text = values?.transcript ?? "";
                await Clipboard.paste(text);
                await Clipboard.copy(text);
                await popToRoot();
              }}
            />
            <Action.SubmitForm
              title="Copy Edited Transcript"
              onSubmit={(values: { transcript?: string }) => Clipboard.copy(values?.transcript ?? "")}
            />
            <Action title="Start New Recording" onAction={handleReset} shortcut={Keyboard.Shortcut.Common.New} />
          </ActionPanel>
        }
      >
        <Form.TextArea id="transcript" title="Transcript" defaultValue={state.transcript} storeValue={false} />
      </Form>
    );
  }

  const getMarkdown = () => {
    switch (state.status) {
      case "recording":
        return waveformMarkdown || "## Recording...  \n\nPress Enter to stop and transcribe.";
      case "transcribing":
        return spinnerMarkdown || "## Transcribing...\n\nPlease wait while we process your audio.";
      case "transcribing_error":
        return `## Transcription Failed\n\n${
          state.error || "An error occurred during transcription."
        }\n\nYou can try again or start a new recording.`;
      case "idle":
        if (state.error?.includes("Recording failed:")) {
          return `## Recording Failed\n\n${state.error}\n\nPlease check your audio settings and try again.`;
        }
        return "## Ready to Record\n\nPress **Enter** to start a new recording.";
      default:
        return "";
    }
  };

  const getActions = () => {
    switch (state.status) {
      case "recording":
        return (
          <ActionPanel>
            <Action title="Stop and Transcribe" onAction={stopAndTranscribe} />
            <Action title="Cancel Recording" onAction={handleCancel} shortcut={{ modifiers: ["cmd"], key: "z" }} />
          </ActionPanel>
        );
      case "transcribing_error":
        return (
          <ActionPanel>
            <Action title="Retry Transcription" onAction={retryTranscription} />
            <Action title="Start New Recording" onAction={handleReset} shortcut={Keyboard.Shortcut.Common.New} />
          </ActionPanel>
        );
      case "idle":
        return (
          <ActionPanel>
            <Action title="Start New Recording" onAction={startRecording} />
          </ActionPanel>
        );
      default:
        return null;
    }
  };

  return <Detail isLoading={state.status === "transcribing"} markdown={getMarkdown()} actions={getActions()} />;
}
