import { LaunchType, launchCommand } from "@raycast/api";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Re-launch the menu bar command so it picks up the fresh cache.
 *
 * Returns the promise so one-shot (no-view) commands can await it — their
 * process is torn down as soon as the command resolves, which would otherwise
 * cut off a fire-and-forget launch.
 */
export function refreshMenuBar() {
  return launchCommand({ name: "menuBar", type: LaunchType.Background }).catch(() => {
    // Menu bar command may be disabled — safe to ignore
  });
}
