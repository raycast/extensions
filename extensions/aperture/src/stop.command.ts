import { dirname } from "path";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { Alert, Clipboard, Toast, confirmAlert, getPreferenceValues, open, showToast } from "@raycast/api";
import { clearStoredRecording, getStoredRecording } from "~/utils/storage";
import { moveFileToSaveLocation } from "~/utils/fs";
import { Aperture } from "~/api/aperture";
import { killRecordingIndicator } from "~/utils/indicator";

const { postSaveAction, copyToClipboard } = getPreferenceValues<Preferences>();

export default async function stopRecordingCommand() {
  const recording = await getStoredRecording();
  const { pid, filePath, startTime } = recording ?? {};

  if (!pid || Number.isNaN(pid) || !filePath || !startTime) {
    return showToast({ title: "No recording in progress", style: Toast.Style.Failure });
  }

  const hasConfirmedAction = await getStopRecordingConfirmation(startTime);
  if (!hasConfirmedAction) return;

  await showToast({ title: "Saving recording...", style: Toast.Style.Animated });
  const { endTime } = await new Aperture(recording).stopRecording();
  await killRecordingIndicator();

  const savedFilePath = await moveFileToSaveLocation(filePath, endTime);
  if (postSaveAction === "open") await open(savedFilePath);
  if (postSaveAction === "openFinder") await open(dirname(savedFilePath), "com.apple.Finder");
  if (copyToClipboard) await Clipboard.copy({ file: savedFilePath });
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
