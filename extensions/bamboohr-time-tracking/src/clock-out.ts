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
    if (status.status === "clocked_out") {
      const last = status.lastEntry;
      const endedAt = last?.end ? timeFormatter.format(last.end) : undefined;
      const duration = last?.durationMs
        ? formatDuration(last.durationMs)
        : undefined;
      const detail =
        endedAt && duration
          ? `Already clocked out (last entry ended ${endedAt}, ${duration})`
          : "Already clocked out";
      await showToast(Toast.Style.Success, "Already clocked out", detail);
      return;
    }
  } catch (error) {
    console.warn("Failed to check status before clock out", error);
  }

  try {
    await client.clockOut();
    await showToast(Toast.Style.Success, "Clocked out");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    await showToast(Toast.Style.Failure, "Failed to clock out", message);
  }
}
