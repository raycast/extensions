/**
 * Upgrade All Packages — and the operation runner.
 *
 * This no-view command has two roles:
 * 1. Invoked directly: checks for updates (live preflight, never a stale
 *    cache), confirms, and upgrades everything that isn't pinned.
 * 2. Launched by other commands with {requestId} context: executes the
 *    materialized request from op-request.json. ALL of this extension's
 *    mutations run here, because view workers die on Escape and ~90 s after
 *    the window deactivates, while a user-initiated no-view command lives
 *    until its promise settles. Disabling this command in Raycast settings
 *    breaks every operation — the views surface that error explicitly.
 *
 * The promise returned here stays pending for the whole operation; resolving
 * earlier would let Raycast tear the worker down mid-install.
 */

import { showToast, Toast, type LaunchProps } from "@raycast/api";

import { applyPreferences } from "./core/prefs";
import { takeOperationRequest } from "./core/operations";
import { runDirectUpgradeAll, runOperationWithFollowUp } from "./core/runner";

type RunnerLaunchProps = LaunchProps<{
  launchContext?: { requestId?: string };
}>;

export default async function UpgradeAllPackages(props: RunnerLaunchProps) {
  applyPreferences();

  const requestId = props.launchContext?.requestId;
  if (!requestId) {
    await runDirectUpgradeAll();
    return;
  }

  const request = takeOperationRequest(requestId);
  if (!request) {
    await showToast({
      style: Toast.Style.Failure,
      title: "The operation could not start",
      message: "Try running it again",
    });
    return;
  }
  await runOperationWithFollowUp(request);
}
