import { showHUD } from "@raycast/api";
import { stopAndCopyStopwatch } from "./stopwatchUtils";

export default async () => {
  showHUD("Stopwatch Stopped");
  stopAndCopyStopwatch();
};
