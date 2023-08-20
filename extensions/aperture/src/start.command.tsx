import { Action, ActionPanel, List, Toast, environment, popToRoot, showToast } from "@raycast/api";
import { chmod } from "fs/promises";
import { join } from "path";
import { saveRecordingData } from "~/utils/storage";
import { useAperture } from "~/utils/useAperture";

const BIN_PATH = join(environment.assetsPath, "aperture");

export default function StartRecordingCommand() {
  const recorder = useAperture();

  const handleSelect = async () => {
    await chmod(BIN_PATH, 755);

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
