import { Alert, Toast, confirmAlert, open, showToast } from "@raycast/api";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { clearStoredRecording, getStoredRecording } from "~/utils/storage";
import { moveFileToSaveLocation } from "~/utils/fs";
import { Aperture } from "~/api/temp";

export default async function StopRecordingCommand() {
  const recording = await getStoredRecording();
  const { pid, filePath, startTime } = recording ?? {};

  if (!pid || Number.isNaN(pid) || !filePath || !startTime) {
    return showToast({ title: "No recording in progress", style: Toast.Style.Failure });
  }

  const confirmed = await getStopRecordingConfirmation(startTime);
  if (!confirmed) return;

  await showToast({ title: "Saving recording...", style: Toast.Style.Animated });
  const recorder = new Aperture(recording)
  const { endTime } = await recorder.stopRecording();
  
  const savedFilePath = await moveFileToSaveLocation(filePath, endTime);
  await open(savedFilePath);
  await clearStoredRecording();
}

function getStopRecordingConfirmation(startTime: Date) {
  const elapsedString = formatDistanceToNow(startTime, { includeSeconds: true, addSuffix: true });
  return confirmAlert({
    title: "Stop Recording",
    message: `You started recording ${elapsedString}.\nDo you wish to stop it?`,
    primaryAction: {
      title: 'Stop Recording',
      style: Alert.ActionStyle.Destructive
    }
  })
}