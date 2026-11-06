import { environment, getPreferenceValues, LaunchType, showHUD } from "@raycast/api";
import { connectionId, listAuthFiles } from "./api";
import { fetchAllQuotas, observations } from "./history";
import { supportsQuota } from "./quota";

/** Raycast schedules this approximately every 15 minutes. Sleep and closed Raycast leave gaps, never zeroes. */
export default async function Command() {
  const background = environment.launchType === LaunchType.Background;
  if (background && !getPreferenceValues<Preferences>().collectHistory) return;
  try {
    const connection = connectionId();
    const accounts = (await listAuthFiles(connection)).filter(supportsQuota);
    const result = await fetchAllQuotas(connection, accounts);
    const saved = new Set(observations(accounts, result.quotas).map((o) => o.account)).size;
    if (!background) await showHUD(result.historyError ?? `Recorded quota for ${saved} accounts`);
  } catch (error) {
    if (!background) await showHUD(error instanceof Error ? error.message : "Couldn't record quota");
    // Background failures create gaps, not fabricated samples. The next scheduled run retries.
  }
}
