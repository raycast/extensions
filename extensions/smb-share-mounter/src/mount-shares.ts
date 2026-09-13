import { showToast, Toast } from "@raycast/api";
import { buildShare, Share } from "./lib/share";
import { isSmbReachable, mountShare } from "./lib/mount";
import { getServers } from "./lib/storage";

export default async function command() {
  const entries = await getServers();

  if (!entries.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No servers configured",
      message: "Run “Add SMB Server” to add one.",
    });
    return;
  }

  const shares: Share[] = [];
  const invalid: string[] = [];

  for (const entry of entries) {
    try {
      shares.push(buildShare(entry));
    } catch (error) {
      invalid.push(
        error instanceof Error ? error.message : `Invalid entry: ${entry.host}`,
      );
    }
  }

  const requested: string[] = [];
  const unavailable: string[] = [];
  const openFailures: string[] = [];

  for (const share of shares) {
    if (!(await isSmbReachable(share.host))) {
      unavailable.push(share.label);
      continue;
    }

    try {
      await mountShare(share);
      requested.push(share.label);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.replace(/\s+/g, " ")
          : "open failed";
      openFailures.push(`${share.label} (${message})`);
    }
  }

  const failures = [
    invalid.length ? `invalid: ${invalid.join(", ")}` : "",
    unavailable.length ? `unreachable: ${unavailable.join(", ")}` : "",
    openFailures.length ? `failed: ${openFailures.join(", ")}` : "",
  ].filter(Boolean);

  if (failures.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Some SMB shares were not mounted",
      message: failures.join(" — "),
    });
    return;
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Mount requested",
    message: requested.join(", "),
  });
}
