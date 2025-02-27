import { LaunchProps } from "@raycast/api";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { produceOutput, showError } from "./utils";

export default async function Command(props?: LaunchProps<{ arguments: Arguments.DateDistance }>) {
  try {
    const targetDateString = props?.arguments.targetDate;

    if (!targetDateString) {
      throw new Error("Target date is required");
    }

    let targetDate: Date;

    // Try to parse the target date
    try {
      targetDate = parseISO(targetDateString.trim());
      if (isNaN(targetDate.getTime())) {
        targetDate = new Date(targetDateString.trim());
      }
    } catch {
      targetDate = new Date(targetDateString.trim());
    }

    if (isNaN(targetDate.getTime())) {
      throw new Error("Invalid target date");
    }

    const distanceString = formatDistanceToNowStrict(targetDate, { addSuffix: true });

    await produceOutput(distanceString);
  } catch (error) {
    await showError("Failed to calculate date distance: " + String(error));
  }
}
