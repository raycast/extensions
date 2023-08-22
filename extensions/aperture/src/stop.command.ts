import { dirname } from "path";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { Alert, Toast, confirmAlert, getPreferenceValues, open, showToast } from "@raycast/api";
import { clearStoredRecording, getStoredRecording } from "~/utils/storage";
import { moveFileToSaveLocation } from "~/utils/fs";
import { Aperture } from "~/api/aperture";

const { postSaveAction } = getPreferenceValues<Preferences>();

export default async function StopRecordingCommand() {
  const recording = await getStoredRecording();
  const { pid, filePath, startTime } = recording ?? {};

  if (!pid || Number.isNaN(pid) || !filePath || !startTime) {
    return showToast({ title: "No recording in progress", style: Toast.Style.Failure });
  }

  const confirmed = await getStopRecordingConfirmation(startTime);
  if (!confirmed) return;

  await showToast({ title: "Saving recording...", style: Toast.Style.Animated });
  const recorder = new Aperture(recording);
  const { endTime } = await recorder.stopRecording();

  const savedFilePath = await moveFileToSaveLocation(filePath, endTime);
  if (postSaveAction === "open") await open(savedFilePath);
  if (postSaveAction === "openFinder") await open(dirname(savedFilePath), "com.apple.Finder");
  await clearStoredRecording();
}

function getStopRecordingConfirmation(startTime: Date) {
  const elapsedString = formatDistanceToNow(startTime, { includeSeconds: true, addSuffix: true });
  return confirmAlert({
    title: "Stop Recording",
    message: `You started recording ${elapsedString}.\nDo you wish to stop it?`,
    primaryAction: {
      title: "Stop Recording",
      style: Alert.ActionStyle.Destructive,
    },
  });
}
