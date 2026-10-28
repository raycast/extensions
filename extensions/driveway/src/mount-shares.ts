import { showToast, Toast } from "@raycast/api";
import { buildShare, ServerEntry, Share } from "./lib/share";
import { findMountedShare, isReachable, listMountedShares, mountShare } from "./lib/mount";
import { getServers } from "./lib/storage";
import { errorText } from "./lib/errors";
import { refreshMenuBar } from "./lib/menu-bar-cache";
import { mountsInFlight } from "./lib/in-flight";

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

  // The entry is kept beside the share: matching a live mount needs the saved
  // host and path, which a built Share no longer carries.
  const targets: { entry: ServerEntry; share: Share }[] = [];
  const invalid: string[] = [];

  for (const entry of entries) {
    try {
      targets.push({ entry, share: buildShare(entry) });
    } catch (error) {
      invalid.push(errorText(error, `Invalid entry: ${entry.host}`));
    }
  }

  const requested: string[] = [];
  const alreadyMounted: string[] = [];
  const stillConnecting: string[] = [];
  const unavailable: string[] = [];
  const openFailures: string[] = [];

  // `mount volume` on a share that is already mounted doesn't no-op: macOS
  // mounts it a second time, at "/Volumes/<name>-1". So skip those, the way
  // Manage Drives and the menu bar already do.
  const mounted = await listMountedShares();
  // A mount the menu bar started and couldn't wait for is still running, so
  // mounting it again here would attach the same share twice.
  const inFlight = await mountsInFlight();

  for (const { entry, share } of targets) {
    if (findMountedShare(mounted, entry)) {
      alreadyMounted.push(share.label);
      continue;
    }

    if (inFlight.has(entry.id)) {
      stillConnecting.push(share.label);
      continue;
    }

    if (!(await isReachable(share.host, share.protocol))) {
      unavailable.push(share.label);
      continue;
    }

    try {
      await mountShare(share);
      requested.push(share.label);
    } catch (error) {
      openFailures.push(`${share.label} (${errorText(error, "mounting failed")})`);
    }
  }

  const failures = [
    invalid.length ? `invalid: ${invalid.join(", ")}` : "",
    unavailable.length ? `unreachable: ${unavailable.join(", ")}` : "",
    openFailures.length ? `failed: ${openFailures.join(", ")}` : "",
    stillConnecting.length ? `still connecting: ${stillConnecting.join(", ")}` : "",
  ].filter(Boolean);

  if (requested.length) await refreshMenuBar();

  if (failures.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Some drives were not mounted",
      message: failures.join("; "),
    });
    return;
  }

  if (!requested.length) {
    await showToast({
      style: Toast.Style.Success,
      title: alreadyMounted.length === 1 ? "Already connected" : `All ${alreadyMounted.length} already connected`,
      message: alreadyMounted.join(", "),
    });
    return;
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Mount requested",
    message: [requested.join(", "), alreadyMounted.length ? `${alreadyMounted.length} already connected` : ""]
      .filter(Boolean)
      .join("; "),
  });
}
