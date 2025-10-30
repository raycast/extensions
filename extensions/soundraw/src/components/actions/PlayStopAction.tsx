import { Action, Icon, showToast, Toast } from "@raycast/api";
import { playAudio, stopAudio } from "../../lib/audio";
import { usePlaybackState } from "../../lib/hooks";
import { Sample } from "../../lib/types";

interface PlayStopActionProps {
  sample: Sample;
}

export function PlayStopAction({ sample }: PlayStopActionProps) {
  const isPlaying = usePlaybackState(sample.id);

  const handlePlay = async () => {
    try {
      if (isPlaying) {
        console.debug(`[audio] PlayStopAction: stopping sampleId=${sample.id}`);
        await stopAudio();
      } else {
        console.debug(`[audio] PlayStopAction: playing sampleId=${sample.id}, url=${sample.sample}`);
        await playAudio(sample.sample, sample.id, sample.name);
      }
    } catch (error) {
      console.debug(`[audio] PlayStopAction: error - ${error instanceof Error ? error.message : "Unknown error"}`);
      await showToast({
        title: "Playback Failed",
        message: error instanceof Error ? error.message : "Failed to play audio",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Action
      title={isPlaying ? "Stop" : "Play"}
      icon={isPlaying ? Icon.Stop : Icon.Play}
      onAction={handlePlay}
      shortcut={{ modifiers: ["cmd", "shift", "ctrl"], key: "p" }}
    />
  );
}
