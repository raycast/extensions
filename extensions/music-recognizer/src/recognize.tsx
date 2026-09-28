import { Action, ActionPanel, Detail, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import fs from "node:fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { addToHistory } from "./lib/history";
import { captureFilePath, recordSystemAudio } from "./lib/recorder";
import { provider, recognizeWavFile } from "./lib/recognition";
import { TrackDetail } from "./lib/track-detail";
import type { RecognizedTrack } from "./lib/types";

type Stage =
  | { kind: "recording" }
  | { kind: "recognizing" }
  | { kind: "match"; track: RecognizedTrack }
  | { kind: "no-match"; silent: boolean }
  | { kind: "error"; message: string };

// Below this RMS (full scale = 1.0) the capture is effectively silence; skip
// the API round trip and tell the user nothing was playing.
const SILENCE_RMS_THRESHOLD = 0.0005;

export default function RecognizeCommand() {
  const [stage, setStage] = useState<Stage>({ kind: "recording" });
  const running = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const duration = parseInt(getPreferenceValues<Preferences.Recognize>().duration, 10);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setStage({ kind: "recording" });
      const { wavPath, stats } = await recordSystemAudio(duration, controller.signal);
      if (stats.outSamples === 0 || stats.rms < SILENCE_RMS_THRESHOLD) {
        setStage({ kind: "no-match", silent: true });
        return;
      }

      setStage({ kind: "recognizing" });
      const track = await recognizeWavFile(wavPath);

      if (!track) {
        setStage({ kind: "no-match", silent: false });
        return;
      }
      await addToHistory(track);
      setStage({ kind: "match", track });
    } catch (error) {
      // An aborted run was either superseded by a newer one or the window is
      // closing; in both cases its failure is not worth showing.
      if (controller.signal.aborted) return;
      // The error view below already shows this; a toast on top would be noise.
      setStage({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      // Only the run that still owns the controller may reset state and delete
      // the capture - a superseded run must not touch its successor's file.
      if (abortRef.current === controller) {
        running.current = false;
        abortRef.current = null;
        // Never keep the raw recording around: silent captures and failures
        // clean up just like a successful match does. Windows can still have
        // the file locked, and that must not block a retry.
        try {
          fs.rmSync(captureFilePath(), { force: true });
        } catch {
          // ignored on purpose
        }
      }
    }
  }, [duration]);

  useEffect(() => {
    void run();
    // Closing the window mid-recording has to stop the PowerShell child as
    // well; otherwise it keeps going and writes the clip after cleanup ran.
    return () => {
      abortRef.current?.abort();
      // Clearing the guard lets a remount start a fresh run; React invokes
      // effects twice in development, and the first one is aborted above.
      running.current = false;
    };
  }, [run]);

  const retryAction = (
    <Action
      title="Recognize Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={run}
    />
  );

  switch (stage.kind) {
    case "recording":
      return (
        <Detail
          isLoading
          markdown={`## Listening…\n\nRecording ${duration} seconds of system audio. Keep the music playing.`}
        />
      );
    case "recognizing":
      return (
        <Detail isLoading markdown={`## Identifying…\n\nSending the recording to ${provider.name} for recognition.`} />
      );
    case "no-match":
      return (
        <Detail
          markdown={
            stage.silent
              ? `## Nothing to Hear\n\nThe recording came back silent. Make sure music is actually playing on your **default output device**, then try again.`
              : `## No Match\n\n${provider.name} couldn't identify this one. Try again during a clearer, more distinctive part of the song.`
          }
          actions={<ActionPanel>{retryAction}</ActionPanel>}
        />
      );
    case "error":
      return (
        <Detail
          markdown={`## Something Went Wrong\n\n\`\`\`\n${stage.message}\n\`\`\``}
          actions={<ActionPanel>{retryAction}</ActionPanel>}
        />
      );
    case "match":
      return <TrackDetail track={stage.track} extraActions={retryAction} />;
  }
}
