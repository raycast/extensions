import { getPreferenceValues, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { callCider, seekTo } from "./functions";

export interface Seek {
  timestamp: string;
}

interface currentPlaying {
  info: {
    durationInMillis: number;
  };
}

interface Preferences {
  exitOnSuccess: boolean;
}

async function noCider() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Couldn't Connect to Cider",
    message: "Make sure Cider is running and playing something and try again.",
  });
}

async function noPlayback() {
  await showToast({
    style: Toast.Style.Failure,
    title: "No Playback",
    message: "Cider is running but nothing is playing.",
  });
}

export default async function Command(props: LaunchProps<{ arguments: Seek }>) {
  const { timestamp } = props.arguments;
  const { exitOnSuccess } = getPreferenceValues() as Preferences;

  // timestamp must match mm:ss or ss or sss or s
  if (!timestamp.match(/^(?:[0-9]?[0-9]:)?[0-9]?[0-9]?[0-9]$/)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Timestamp",
      message: "Timestamp must match one of those : mm:ss, s, ss, sss",
    });
    return;
  }

  try {
    await callCider("/active");
    try {
      const { info } = (await callCider("/playback/now-playing")) as currentPlaying;

      const { durationInMillis } = info;
      const [seconds, minutes] = timestamp.split(":").reverse();
      const timestampInSeconds = (parseInt(minutes) || 0) * 60 + parseInt(seconds);
      if (timestampInSeconds >= durationInMillis / 1000)
        return await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Timestamp",
          message: "Timestamp must be less than the duration of the song.",
        });

      await seekTo(timestampInSeconds);

      if (exitOnSuccess) await showHUD("⏩ Seeked to Timestamp");
      else
        await showToast({
          style: Toast.Style.Success,
          title: "Seeked to Timestamp",
        });
    } catch {
      await noPlayback();
    }
  } catch {
    await noCider();
  }
}
