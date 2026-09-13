import { showToast, Toast } from "@raycast/api";
import { buildShare } from "./lib/share";
import {
  findMountedShare,
  listMountedSmbShares,
  unmountShare,
} from "./lib/mount";
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

  const mounted = await listMountedSmbShares();

  const unmounted: string[] = [];
  const invalid: string[] = [];
  const failures: string[] = [];

  for (const entry of entries) {
    let label = entry.alias || entry.host;

    try {
      label = buildShare(entry).label;
    } catch (error) {
      invalid.push(
        error instanceof Error ? error.message : `Invalid entry: ${entry.host}`,
      );
      continue;
    }

    const found = findMountedShare(mounted, entry);
    if (!found) continue;
    try {
      await unmountShare(entry);
      mounted.splice(mounted.indexOf(found), 1);
      unmounted.push(label);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.replace(/\s+/g, " ")
          : "unmount failed";
      failures.push(`${label} (${message})`);
    }
  }

  const problems = [
    invalid.length ? `invalid: ${invalid.join(", ")}` : "",
    failures.length ? `failed: ${failures.join(", ")}` : "",
  ].filter(Boolean);

  if (problems.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Some SMB shares were not unmounted",
      message: problems.join(" — "),
    });
    return;
  }

  if (!unmounted.length) {
    await showToast({
      style: Toast.Style.Success,
      title: "Nothing to unmount",
      message: "No saved shares are currently mounted.",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Shares unmounted",
    message: unmounted.join(", "),
  });
}
