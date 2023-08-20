import { Alert, Toast, confirmAlert, open, showToast } from "@raycast/api";
import { statSync } from "fs";
import { kill } from "process";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { clearStoredRecording, getStoredRecording } from "~/utils/storage";

export default async function StopRecordingCommand() {
  const { pid, filePath, startTime } = await getStoredRecording();
  if (!pid || Number.isNaN(pid) || !filePath || !startTime) {
    return showToast({ title: "No recording in progress", style: Toast.Style.Failure });
  }

  const confirmed = await getStopConfirmation(startTime);
  if (!confirmed) return;

  await showToast({ title: "Stopping recording...", style: Toast.Style.Animated });

  kill(pid);
  await waitUntilFileIsAvailable(filePath);
  await open(filePath);
  await clearStoredRecording();
}

function waitUntilFileIsAvailable(path: string): Promise<void> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      try {
        const stats = statSync(path);
        if (stats.isFile()) {
          clearInterval(interval);
          resolve();
        }
      } catch (e) {
        // ignore
      }
    }, 1000);
  });
}

function getStopConfirmation(startTime: Date) {
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