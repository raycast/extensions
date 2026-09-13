import { Action, ActionPanel, Detail, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "node:fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { addToHistory } from "./lib/history";
import { captureFilePath, recordSystemAudio } from "./lib/recorder";
import { recognizeWavFile } from "./lib/shazam";
import { CopyActions, OpenActions } from "./lib/track-actions";
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

  const duration = parseInt(getPreferenceValues<Preferences.Recognize>().duration, 10);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      setStage({ kind: "recording" });
      const { wavPath, stats } = await recordSystemAudio(duration);
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
      setStage({ kind: "error", message: error instanceof Error ? error.message : String(error) });
      await showFailureToast(error, { title: "Recognition failed" });
    } finally {
      running.current = false;
      // Never keep the raw recording around: silent captures and failures must
      // clean up just like a successful match does. Windows can still have the
      // file locked, and that must not stop the user from trying again - the
      // next capture overwrites it anyway.
      try {
        fs.rmSync(captureFilePath(), { force: true });
      } catch {
        // ignored on purpose
      }
    }
  }, [duration]);

  useEffect(() => {
    void run();
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
          navigationTitle="Recognize Song"
          markdown={`## Listening…\n\nRecording ${duration} seconds of system audio. Keep the music playing.`}
        />
      );
    case "recognizing":
      return (
        <Detail
          isLoading
          navigationTitle="Recognize Song"
          markdown={`## Identifying…\n\nFingerprinting the recording and asking Shazam.`}
        />
      );
    case "no-match":
      return (
        <Detail
          navigationTitle="Recognize Song"
          markdown={
            stage.silent
              ? `## Nothing to Hear\n\nThe recording came back silent. Make sure music is actually playing on your **default output device**, then try again.`
              : `## No Match\n\nShazam couldn't identify this one. Try again during a clearer, more distinctive part of the song.`
          }
          actions={<ActionPanel>{retryAction}</ActionPanel>}
        />
      );
    case "error":
      return (
        <Detail
          navigationTitle="Recognize Song"
          markdown={`## Something Went Wrong\n\n\`\`\`\n${stage.message}\n\`\`\``}
          actions={<ActionPanel>{retryAction}</ActionPanel>}
        />
      );
    case "match":
      return <MatchView track={stage.track} retryAction={retryAction} />;
  }
}

function MatchView({ track, retryAction }: { track: RecognizedTrack; retryAction: React.ReactNode }) {
  const cover = track.coverUrl ? `![Cover](${track.coverUrl}?raycast-width=220&raycast-height=220)\n\n` : "";
  return (
    <Detail
      navigationTitle={track.title}
      markdown={`${cover}# ${track.title}\n\n### ${track.artist}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Artist" text={track.artist} />
          {track.album && <Detail.Metadata.Label title="Album" text={track.album} />}
          {track.year && <Detail.Metadata.Label title="Released" text={track.year} />}
          {track.shazamUrl && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link title="Shazam" target={track.shazamUrl} text="View on Shazam" />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenActions track={track} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyActions track={track} />
          </ActionPanel.Section>
          <ActionPanel.Section>{retryAction}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
