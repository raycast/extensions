import { List, LaunchProps, showToast, Toast, popToRoot, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import Timer from "@gibme/timer";
import sound from "sound-play";

export default function Command(props: LaunchProps) {
  const { bpm } = props.arguments;
  const [taps, setTaps] = useState<number>(0);
  console.log(bpm);
  if (Number.isInteger(Number(bpm)) && Number(bpm) > 0 && Number(bpm) < 700) {
    const timer = new Timer(60000 / Number(bpm));
    useEffect(() => {
      timer.start();
    }, []);

    timer.on("tick", () => {
      // do something
      console.log("click");
      sound.play(environment.assetsPath + "/sfx/" + "metronome-click.mp3");
      setTaps((previous) => previous + 1);
    });

    return (
      <List>
        <List.EmptyView
          title={`BPM: ${bpm}`}
          description="Escape this extension to stop the metronome or change the BPM"
          icon={taps % 2 === 0 ? "metronome-left.png" : "metronome-right.png"}
        />
      </List>
    );
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid BPM",
      message: "BPM must be a positive integer below 700",
    });
    popToRoot();
  }
}
