import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
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
        actions={
          <ActionPanel>
            <Action
              title="Stop and Transcribe"
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
    return <Detail isLoading markdown="Transcribing..." />;
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
