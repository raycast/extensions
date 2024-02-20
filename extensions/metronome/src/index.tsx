import { List, LaunchProps, showToast, Toast, popToRoot, environment, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import sound from "sound-play";

export default function Command(props: LaunchProps) {
  const { bpm, group = 1 } = props.arguments; // Set default value for group
  const [taps, setTaps] = useState<number>(0);
  const groupPositionRef = useRef<number>(1);
  const [isRunning, setIsRunning] = useState(true); // Added state variable for metronome status

  const handleStartStop = () => {
    if (isRunning) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  const stopMetronome = () => {
    setIsRunning(false);
    setTaps(0);
    groupPositionRef.current = 1;
  };

  const startMetronome = () => {
    setIsRunning(true);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const interval = 60000 / Number(bpm);

    function handleClick() {
      if (groupPositionRef.current === 1) {
        sound.play(environment.assetsPath + "/sfx/" + "metronome-click.wav");
      } else {
        sound.play(environment.assetsPath + "/sfx/" + "metronome-click_lower.wav");
      }

      if (groupPositionRef.current === Number(group)) {
        groupPositionRef.current = 1;
      } else {
        groupPositionRef.current += 1;
      }

      setTaps((previousTaps) => previousTaps + 1);
    }

    if (isRunning) {
      timer = setInterval(handleClick, interval);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [bpm, group, isRunning]);

  if (
    !isNaN(Number(bpm)) &&
    Number(bpm) > 0 &&
    Number(bpm) < 500 &&
    !isNaN(Number(group) || 1) &&
    Number(group || 1) > 0 &&
    Number(group || 1) < 500
  ) {
    const description = isRunning ? "Click ↵ to pause" : "Click ↵ to play";

    return (
      <List searchBarPlaceholder="" searchText="">
        <List.EmptyView
          title={`BPM: ${bpm} | Accents: Per ${group || 1} ${group == 1 ? "Click" : "Clicks"} | Clicks: ${taps}`}
          description={description}
          icon={taps % 2 === 0 ? "metronome-left.png" : "metronome-right.png"}
          actions={
            <ActionPanel>
              <Action
                title={isRunning ? "Pause" : "Play"}
                icon={isRunning ? Icon.Pause : Icon.Play}
                onAction={handleStartStop}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Inputs",
      message: "Inputs must be positive numbers below 500",
    });
    popToRoot();
    return null;
  }
}
