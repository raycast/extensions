import { LocalStorage, Toast, confirmAlert, open, showToast } from "@raycast/api";
import { statSync } from "fs";
import { kill } from "process";

export default async function StopRecordingCommand() {
  const pid = Number(await LocalStorage.getItem<string>("aperture-processId"));
  const path = await LocalStorage.getItem<string>("aperture-filePath");
  if (!pid || Number.isNaN(pid) || !path) {
    return showToast({ title: "No recording in progress", style: Toast.Style.Failure });
  }

  const isConfirmed = await confirmAlert({
    title: "Stop Recording",
    message: "Are you sure you want to stop your current screen recording?",
  });
  if (!isConfirmed) return;

  await showToast({ title: "Stopping recording...", style: Toast.Style.Animated });

  kill(pid);
  await waitUntilFileIsAvailable(path);
  await open(path);

  await LocalStorage.removeItem("aperture-processId");
  await LocalStorage.removeItem("aperture-filePath");
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
