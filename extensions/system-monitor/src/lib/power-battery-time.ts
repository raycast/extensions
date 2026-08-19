import { convertMsToTime } from "../utils";

/** pmset logs power-source summaries as "Using Batt(Charge: nn)" / "Using AC(Charge: nn)".
 *  The current battery stint starts at the earliest Batt entry after the last AC entry. */
export function parseTimeOnBatteryFromPmsetLog(logOutput: string, now: Date = new Date()): string {
  const lines = logOutput.split("\n");
  let stintStartLine = "";

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];

    if (line.includes("Using AC")) {
      break;
    }

    if (line.includes("Using Batt")) {
      stintStartLine = line;
    }
  }

  if (!stintStartLine) {
    return "N/A";
  }

  const dateStr = stintStartLine.split(/\s+/).slice(0, 3).join(" ");
  const startTime = new Date(Date.parse(dateStr));

  if (Number.isNaN(startTime.valueOf())) {
    return "N/A";
  }

  return convertMsToTime(now.valueOf() - startTime.valueOf());
}
