import { Action, ActionPanel, Clipboard, Detail, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { speakText, type SpeechFeedback } from "./speech";

export function SpeechView({ getText }: { getText: () => Promise<string | undefined> }) {
  const controller = useRef<AbortController | null>(null);
  const [feedback, setFeedback] = useState<SpeechFeedback>({ title: "Preparing speech...", phase: "waiting" });
  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    let mounted = true;
    void speakText(getText, current.signal, (value) => {
      if (mounted) setFeedback(value);
    }).catch(() => undefined);
    return () => {
      mounted = false;
      current.abort();
    };
  }, [getText]);

  return (
    <Detail
      isLoading={feedback.phase === "waiting"}
      navigationTitle="FlowSpeech TTS"
      markdown={`# ${feedback.title}\n\n${feedback.message ? "```\n" + feedback.message.replaceAll("`", "'") + "\n```" : ""}`}
      actions={
        <ActionPanel>
          {feedback.phase !== "finished" && (
            <Action
              title={feedback.phase === "playing" ? "Stop Playback" : "Stop Waiting"}
              icon={Icon.Stop}
              onAction={() => controller.current?.abort()}
            />
          )}
          {feedback.requestId && (
            <Action
              title="Copy Request ID"
              icon={Icon.Clipboard}
              onAction={() => Clipboard.copy(feedback.requestId!)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
