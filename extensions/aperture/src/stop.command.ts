import { Alert, Toast, confirmAlert, open, showToast } from "@raycast/api";
import { kill } from "process";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { clearStoredRecording, getStoredRecording } from "~/utils/storage";
import { moveFileToSaveLocation, waitUntilFileIsAvailable } from "~/utils/fs";

export default async function StopRecordingCommand() {
  const { pid, filePath, startTime } = await getStoredRecording();
  if (!pid || Number.isNaN(pid) || !filePath || !startTime) {
    return showToast({ title: "No recording in progress", style: Toast.Style.Failure });
  }

  const confirmed = await getStopRecordingConfirmation(startTime);
  if (!confirmed) return;

  await showToast({ title: "Saving recording...", style: Toast.Style.Animated });

  kill(pid);
  const endTime = new Date();
  await waitUntilFileIsAvailable(filePath);
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