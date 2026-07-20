import { LocalStorage, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import * as chrono from "chrono-node";

export default async function Command(props: { arguments: { time: string } }) {
  const timeInput = props.arguments.time;

  if (!timeInput) {
    await showFailureToast("No time input provided");
    return;
  }

  try {
    // Parse the natural language time input
    const parsedDate = chrono.parseDate(timeInput);

    if (!parsedDate) {
      await showFailureToast("Could not parse the time input");
      return;
    }

    // Convert to Unix timestamp in milliseconds
    const timestamp = Math.floor(parsedDate.getTime() / 1000);

    // Store the timestamp for future use
    await LocalStorage.setItem("lastRewindTimestamp", timestamp);

    // Create the Rewind AI deeplink
    const deeplink = `rewindai://show-moment?timestamp=${timestamp}`;
    // Open the deeplink
    await open(deeplink);
  } catch (error: unknown) {
    await showFailureToast(error, { title: "Error processing time input" });
  }
}
