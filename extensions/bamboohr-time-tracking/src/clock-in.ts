import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences } from "./preferences";
import { BambooHRClient, formatDuration } from "./bamboo/api";
import { timeFormatter } from "./helpers";

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();

  const client = new BambooHRClient(
    preferences.apiKey,
    preferences.companyDomain,
    preferences.employeeId,
  );

  try {
    const status = await client.getTodayStatus();
    if (status.status === "clocked_in" && status.runningEntry?.start) {
      const started = timeFormatter.format(status.runningEntry.start);
      const runningFor = status.runningEntry.durationMs
        ? formatDuration(status.runningEntry.durationMs)
        : undefined;
      const detail = runningFor
        ? `Already clocked in since ${started} (${runningFor})`
        : `Already clocked in since ${started}`;
      await showToast(Toast.Style.Success, "Already clocked in", detail);
      return;
    }
  } catch (error) {
    // Status check failed; continue and attempt to clock in.
    console.warn("Failed to check status before clock in", error);
  }

  try {
    await client.clockIn();
    await showToast(Toast.Style.Success, "Clocked in");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    await showToast(Toast.Style.Failure, "Failed to clock in", message);
  }
}
