import { Color, Icon } from "@raycast/api";

/** Default install location of the Apple `container` binary. */
export const DEFAULT_BINARY_PATH = "/usr/local/bin/container";

/** Timeout for regular commands. The XPC health ping alone can take up to ~10s. */
export const COMMAND_TIMEOUT_MS = 15_000;

/** Starting the system service spins up VMs and can take a while. */
export const SERVICE_START_TIMEOUT_MS = 60_000;

/** Pulling an image from a registry can be slow on large layers. */
export const PULL_TIMEOUT_MS = 600_000;

/** `inspect` and `logs` output can be large; give execFile room. */
export const MAX_BUFFER = 16 * 1024 * 1024;

/** Number of log lines fetched by default in the one-shot logs view. */
export const DEFAULT_LOG_LINES = 500;

/** Shell launched by "Open Shell in Terminal" (alpine images may lack bash). */
export const DEFAULT_SHELL = "/bin/sh";

/** Interval used by the opt-in auto-refresh preference. */
export const AUTO_REFRESH_INTERVAL_MS = 5_000;

/** Container state reported by the CLI when a container is running. */
export const RUNNING_STATE = "running";

export function stateColor(state: string): Color {
  switch (state) {
    case "running":
      return Color.Green;
    case "stopped":
      return Color.SecondaryText;
    case "stopping":
    case "starting":
      return Color.Yellow;
    default:
      return Color.Orange;
  }
}

export function stateIcon(state: string): Icon {
  return state === RUNNING_STATE ? Icon.CircleFilled : Icon.Circle;
}
