import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openRetraceDeeplink } from "./open-retrace-deeplink";
import { checkRetraceInstallation } from "./utils/checkInstall";

const LAST_TIMESTAMP_KEY = "lastRetraceTimestamp";

export default async function Command() {
  try {
    const installed = await checkRetraceInstallation();
    if (!installed) {
      return;
    }

    const lastTimestamp = await LocalStorage.getItem<string>(LAST_TIMESTAMP_KEY);

    if (!lastTimestamp) {
      await showFailureToast("No previous timestamp found");
      return;
    }

    const normalizedTimestamp = String(lastTimestamp).trim();
    if (!/^\d{10,13}$/.test(normalizedTimestamp)) {
      await showFailureToast("Stored timestamp is invalid");
      return;
    }

    const timestampMs =
      normalizedTimestamp.length === 10 ? String(Number(normalizedTimestamp) * 1000) : normalizedTimestamp;

    await openRetraceDeeplink({
      context: "go-to-last-retrace-timestamp",
      urls: [`retrace://timeline?t=${timestampMs}`, `retrace://timeline?timestamp=${timestampMs}`],
      metadata: {
        storedTimestamp: normalizedTimestamp,
      },
    });
  } catch (error: unknown) {
    await showFailureToast(error, { title: "Error accessing last timestamp" });
  }
}
