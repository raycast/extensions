import fetch from "cross-fetch";
import {
  getPreferenceValues,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

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

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.Seek }>,
) {
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
    await fetch("http://localhost:10769/active");
    try {
      const { info } = (await fetch(
        "http://localhost:10769/currentPlayingSong",
      ).then((res) => res.json())) as currentPlaying;

      const { durationInMillis } = info;
      const [seconds, minutes] = timestamp.split(":").reverse();
      const timestampInSeconds =
        (parseInt(minutes) || 0) * 60 + parseInt(seconds);
      if (timestampInSeconds >= durationInMillis / 1000)
        return await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Timestamp",
          message: "Timestamp must be less than the duration of the song.",
        });

      await fetch(`http://localhost:10769/seekto/${timestampInSeconds}`);

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
