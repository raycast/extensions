import { closeMainWindow, showHUD } from "@raycast/api";
import { getCurrentTimer, stopTimer } from "./toggl";

interface CurrentEntry {
  data: {
    id: number;
    wid: number;
    pid: number;
    billable: boolean;
    start: string;
    duration: number;
    description: string;
    duronly: boolean;
    at: string;
    uid: number;
  };
}

export default async () => {
  await closeMainWindow();
  const entry: CurrentEntry = await getCurrentTimer();
  await stopTimer(entry.data.id);
  await showHUD("Timer stopped! 🎉");
};
