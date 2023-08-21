import { Action, ActionPanel, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { useRef } from "react";
import { Aperture } from "~/api/Aperture";
import { saveRecordingData } from "~/utils/storage";

const RecordingMode = {
  EntireScreen: "entire-screen",
} as const;

type RecordingMode = (typeof RecordingMode)[keyof typeof RecordingMode];

export default function StartRecordingCommand() {
  const selectedRecordingMode = useRef<RecordingMode | null>();

  const handleStartRecording = async () => {
    if (selectedRecordingMode.current == null) return;
    const toast = await showToast({ title: "Starting recording...", style: Toast.Style.Animated });
    try {
      if (selectedRecordingMode.current === RecordingMode.EntireScreen) {
        const recorder = new Aperture();
        const recording = await recorder.startRecording();
        await saveRecordingData(recording);
        toast.style = Toast.Style.Success;
        toast.title = "Recording started";

        await popToRoot();
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start recording";
      console.error("Could not start recording", error);
    }
  };

  const handleSelectionChange = (id: string | null) => {
    selectedRecordingMode.current = id as RecordingMode;
  };

  const commonActions = <Action title="Start Recording" onAction={handleStartRecording} icon={Icon.Camera} />;

  return (
    <List onSelectionChange={handleSelectionChange}>
      <List.Item
        id={RecordingMode.EntireScreen}
        title="Capture Entire Screen"
        icon={Icon.Maximize}
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      />
    </List>
  );
}
