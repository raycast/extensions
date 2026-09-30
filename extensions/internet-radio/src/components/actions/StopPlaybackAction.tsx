import { Action, Icon, showToast } from "@raycast/api";
import { deleteTrack, pausePlayback } from "../../utils";

export default function StopPlaybackAction(props: {
  stationName: string;
  trackID: string;
  onStart?: () => void;
  onFinish?: () => void;
  onCompletion: () => void;
}) {
  const { stationName, trackID, onStart, onFinish, onCompletion } = props;

  return (
    <Action
      title={"Stop Playback"}
      icon={Icon.Stop}
      onAction={async () => {
        onStart?.();
        await pausePlayback();
        await deleteTrack(trackID);
        await showToast({ title: "Stopped Station", message: stationName });
        onCompletion();
        onFinish?.();
      }}
    />
  );
}
