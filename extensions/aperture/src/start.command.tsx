import { Action, ActionPanel, List, Toast, popToRoot, showToast } from "@raycast/api";
import { saveRecordingData } from "~/utils/storage";
import { useAperture } from "~/utils/useAperture";

export default function StartRecordingCommand() {
  const recorder = useAperture();

  const handleSelect = async () => {
    const toast = await showToast({ title: "Starting recording...", style: Toast.Style.Animated });
    try {
      const recording = await recorder.startRecording();
      await saveRecordingData(recording);
      toast.style = Toast.Style.Success;
      toast.title = "Recording started";

      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start recording";
      console.error("Could not start recording", error);
    }
  };

  return (
    <List>
      <List.Item
        title="Entire Screen"
        id="entire-screen"
        actions={
          <ActionPanel>
            <Action title="Start Recording" onAction={handleSelect} />
          </ActionPanel>
        }
      />
    </List>
  );
}
