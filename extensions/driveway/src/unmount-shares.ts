import { showToast, Toast } from "@raycast/api";
import { buildShare } from "./lib/share";
import { findMountedShare, listMountedShares, unmountShare } from "./lib/mount";
import { getServers } from "./lib/storage";
import { errorText } from "./lib/errors";
import { refreshMenuBar } from "./lib/menu-bar-cache";

export default async function command() {
  const entries = await getServers();

  if (!entries.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No drives configured",
      message: "Run “Add Drive” to add one.",
    });
    return;
  }

  const mounted = await listMountedShares();

  const unmounted: string[] = [];
  const invalid: string[] = [];
  const failures: string[] = [];

  for (const entry of entries) {
    let label = entry.alias || entry.host;

    try {
      label = buildShare(entry).label;
    } catch (error) {
      invalid.push(errorText(error, `Invalid entry: ${entry.host}`));
      continue;
    }

    const found = findMountedShare(mounted, entry);
    if (!found) continue;
    try {
      await unmountShare(entry);
      mounted.splice(mounted.indexOf(found), 1);
      unmounted.push(label);
    } catch (error) {
      failures.push(`${label} (${errorText(error, "unmounting failed")})`);
    }
  }

  if (unmounted.length) await refreshMenuBar();

  const problems = [
    invalid.length ? `invalid: ${invalid.join(", ")}` : "",
    failures.length ? `failed: ${failures.join(", ")}` : "",
  ].filter(Boolean);

  if (problems.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Some drives were not unmounted",
      message: problems.join("; "),
    });
    return;
  }

  if (!unmounted.length) {
    await showToast({
      style: Toast.Style.Success,
      title: "Nothing to unmount",
      message: "No saved drives are currently mounted.",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Drives unmounted",
    message: unmounted.join(", "),
  });
}
