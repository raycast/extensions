import { List, Icon, Color } from "@raycast/api";
import { useEffect } from "react";
import { useTuner } from "./hooks/useTuner";
import { centsToDisplayObject } from "./utils/display.utils";

export default function Command() {
  const { startContinuousListening, stopContinuousListening, detectedNote, error } = useTuner();

  useEffect(() => {
    startContinuousListening();

    return () => {
      stopContinuousListening();
    };
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView
          title={error.title}
          description={error.subTitle}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        />
      </List>
    );
  }

  if (detectedNote) {
    const { noteName, cents } = detectedNote;

    const displayObject = centsToDisplayObject(cents);

    return (
      <List>
        <List.EmptyView
          title={noteName}
          description={`${cents > 0 ? "+" : ""}${cents} cents`}
          icon={{ source: displayObject.icon, tintColor: displayObject.color }}
        />
      </List>
    );
  }
  return (
    <List>
      <List.EmptyView title="Play your instrument" icon={{ source: Icon.Heartbeat, tintColor: Color.Blue }} />
    </List>
  );
}
