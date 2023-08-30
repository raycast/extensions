import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, popToRoot, showToast } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";
import { useRef } from "react";
import { Aperture } from "~/api/aperture";
import { Recording } from "~/types/recording";
import { moveFileToSaveLocation } from "~/utils/fs";
import { launchRecordingIndicator } from "~/utils/indicator";
import { clearStoredRecording, getStoredRecording, saveRecordingData } from "~/utils/storage";

const RecordingMode = {
  EntireScreen: "entire-screen",
} as const;

type RecordingMode = (typeof RecordingMode)[keyof typeof RecordingMode];

export default function StartRecordingCommand() {
  const selectedRecordingMode = useRef<RecordingMode>(RecordingMode.EntireScreen);

  const handleStartRecording = async () => {
    try {
      const ongoingRecording = await getStoredRecording();
      if (ongoingRecording && !(await confirmStoppingOngoingRecording(ongoingRecording))) return;

      const toast = await showToast({ title: "Starting recording...", style: Toast.Style.Animated });
      if (selectedRecordingMode.current === RecordingMode.EntireScreen) {
        const recorder = new Aperture();
        const recording = await recorder.startRecording();
        await saveRecordingData(recording);
        await launchRecordingIndicator();
        toast.style = Toast.Style.Success;
        toast.title = "Recording started";
        await popToRoot();
      }
    } catch (error) {
      await showToast({ title: "Could not start recording", style: Toast.Style.Failure });
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

async function confirmStoppingOngoingRecording(recording: Recording): Promise<boolean> {
  const { pid, startTime } = recording;
  if (!pid || Number.isNaN(pid) || !startTime) return true;

  const elapsedString = formatDistanceToNow(startTime, { includeSeconds: true, addSuffix: true });
  const hasConfirmedStopRecording = await confirmAlert({
    title: "You have a recording in progress",
    message: `You started a recording ${elapsedString}.\nDo you wish to stop and saving it before starting a new one?`,
    primaryAction: { title: "Stop Recording", style: Alert.ActionStyle.Destructive },
  });

  if (!hasConfirmedStopRecording) return false;

  await showToast({ title: "Saving recording...", style: Toast.Style.Animated });
  const { filePath, endTime } = await new Aperture(recording).stopRecording();
  await moveFileToSaveLocation(filePath, endTime);
  await clearStoredRecording();

  return true;
}
