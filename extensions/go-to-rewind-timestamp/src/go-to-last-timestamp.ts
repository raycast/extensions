import { LocalStorage, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    // Retrieve the last stored timestamp
    const lastTimestamp = await LocalStorage.getItem("lastRewindTimestamp");

    if (!lastTimestamp) {
      await showFailureToast("No previous timestamp found");
      return;
    }

    console.log(lastTimestamp);

    // Create the Rewind AI deeplink
    const deeplink = `rewindai://show-moment?timestamp=${lastTimestamp}`;
    // Open the deeplink
    await open(deeplink);
  } catch (error: unknown) {
    await showFailureToast(error, { title: "Error accessing last timestamp" });
  }
}
