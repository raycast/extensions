import { open, showToast, ToastStyle } from "@raycast/api";
import * as chrono from "chrono-node";

export default async function Command(props: { arguments: { time: string } }) {
  const timeInput = props.arguments.time;

  if (!timeInput) {
    await showToast(ToastStyle.Failure, "No time input provided");
    return;
  }

  try {
    // Parse the natural language time input
    const parsedDate = chrono.parseDate(timeInput);

    if (!parsedDate) {
      await showToast(ToastStyle.Failure, "Could not parse the time input");
      return;
    }

    // Convert to Unix timestamp in milliseconds
    const timestamp = Math.floor(parsedDate.getTime() / 1000);

    // Create the Rewind AI deeplink
    const deeplink = `rewindai://show-moment?timestamp=${timestamp}`;


    // Open the deeplink
    await open(deeplink);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await showToast(ToastStyle.Failure, "Error processing time input", errorMessage);
  }
}
