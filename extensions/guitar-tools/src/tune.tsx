import { List, Icon, Color, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import { useTuner } from "./hooks/useTuner";
import { centsToDisplayObject } from "./utils/display.utils";
import ListAudioDevices from "./list-audio-devices";

export default function Command() {
  const { push } = useNavigation();
  const { startContinuousListening, stopContinuousListening, detectedNote, error } = useTuner();

  const openAudioDevicePicker = () => {
    stopContinuousListening();
    push(
      <ListAudioDevices
        onDeviceSelected={() => {
          void startContinuousListening();
        }}
      />,
    );
  };

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
          actions={
            <ActionPanel>
              <Action title="Select Audio Input Device" icon={Icon.Microphone} onAction={openAudioDevicePicker} />
            </ActionPanel>
          }
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
          actions={
            <ActionPanel>
              <Action title="Select Audio Input Device" icon={Icon.Microphone} onAction={openAudioDevicePicker} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return (
    <List>
      <List.EmptyView
        title="Play your instrument"
        icon={{ source: Icon.Heartbeat, tintColor: Color.Blue }}
        actions={
          <ActionPanel>
            <Action title="Select Audio Input Device" icon={Icon.Microphone} onAction={openAudioDevicePicker} />
          </ActionPanel>
        }
      />
    </List>
  );
}
