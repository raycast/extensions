import { LocalStorage, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const LAST_TIMESTAMP_KEY = "lastRetraceTimestamp";

export default async function Command() {
  try {
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

    const deeplink = `retrace://timeline?t=${timestampMs}`;
    await open(deeplink);
  } catch (error: unknown) {
    await showFailureToast(error, { title: "Error accessing last timestamp" });
  }
}
