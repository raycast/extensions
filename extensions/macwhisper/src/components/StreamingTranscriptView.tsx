import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { basename } from "node:path";
import { errorMessage, StreamHandle, StreamOptions, streamTranscription } from "../lib/mw";
import { TranscriptDetail } from "./TranscriptDetail";

type Status = "running" | "done" | "failed" | "stopped";

/** Shows a single plain-text transcript as MacWhisper finalizes it, then the regular transcript view. */
export function StreamingTranscriptView({ path, options = {} }: { path: string; options?: StreamOptions }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("running");
  const [failure, setFailure] = useState<string>();
  const handle = useRef<StreamHandle | null>(null);

  useEffect(() => {
    let active = true;
    try {
      handle.current = streamTranscription(path, options, (current) => {
        if (active) setText(current);
      });
    } catch (error) {
      setStatus("failed");
      setFailure(errorMessage(error));
      return;
    }
    handle.current.done
      .then((transcript) => {
        if (!active) return;
        setText(transcript);
        setStatus("done");
        showToast({ style: Toast.Style.Success, title: "Transcription complete" });
      })
      .catch((error) => {
        if (!active) return;
        setStatus((current) => (current === "stopped" ? current : "failed"));
        setFailure(errorMessage(error));
      });
    return () => {
      active = false;
      handle.current?.cancel();
    };
    // Options are fixed for the lifetime of this view, so only the path restarts the stream.
  }, [path]);

  function stop() {
    setStatus("stopped");
    handle.current?.cancel();
  }

  if (status === "done") {
    return <TranscriptDetail results={[{ path, transcript: text }]} format="txt" />;
  }

  const banner =
    status === "running"
      ? "_Transcribing: text appears as MacWhisper finalizes it._"
      : status === "stopped"
        ? "_Stopped. The transcript below is partial._"
        : `**Transcription failed:** ${failure ?? "unknown error"}`;

  return (
    <Detail
      isLoading={status === "running"}
      navigationTitle={basename(path)}
      markdown={`${banner}\n\n${text}`}
      actions={
        <ActionPanel>
          {status === "running" && <Action title="Stop Transcription" icon={Icon.Stop} onAction={stop} />}
          <Action.CopyToClipboard title="Copy Partial Transcript" content={text} />
        </ActionPanel>
      }
    />
  );
}
