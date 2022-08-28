import { showHUD } from "@raycast/api";
import { createAndStartStopwatch } from "./stopwatchUtils";

export default async () => {
  showHUD("Stopwatch Started");
  createAndStartStopwatch();
};
