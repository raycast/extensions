export class GhosthandError extends Error {
  constructor(
    public readonly code: string,
    detail: string,
    public readonly status?: number,
  ) {
    super(detail);
    this.name = "GhosthandError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function problemError(value: unknown, status?: number): GhosthandError {
  if (isRecord(value)) {
    return new GhosthandError(
      typeof value.code === "string" ? value.code : "request-failed",
      typeof value.detail === "string" ? value.detail : "Ghosthand could not complete the request.",
      status,
    );
  }
  return new GhosthandError(
    "request-failed",
    `Ghosthand returned an unexpected response${status ? ` (${status})` : ""}.`,
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export function isCancelled(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || (error instanceof GhosthandError && error.code === "cancelled"))
  );
}

export function recoveryHint(error: unknown): string {
  if (!(error instanceof GhosthandError)) return "Refresh the device list and inspect the screen before trying again.";
  switch (error.code) {
    case "daemon-unreachable":
      return "Install Ghosthand, then run `ghosthand setup` in Terminal to start it and complete setup.";
    case "no-device":
    case "device-not-found":
      return "Connect the iPhone with a USB data cable, unlock it, and refresh devices.";
    case "device-locked":
      return "Unlock the iPhone by hand, then refresh devices.";
    case "device-leased":
      return "Wait for the current holder to finish, then refresh devices. Ghosthand will not take over their lease.";
    case "permission-denied":
    case "bluetooth-unavailable":
    case "bluetooth-disconnected":
    case "login-required":
      return "Run `ghosthand setup` in Terminal to check sign-in, permissions, and Bluetooth pairing.";
    case "subscription-required":
      return "Review your plan in Ghosthand setup or at https://ghosthand.dev/docs/pricing.";
    case "mac-offline":
    case "tunnel-offline":
      return "Check that the Mac is online and signed in through Ghosthand setup.";
    case "lease-invalid":
      return "The lease is no longer valid. Return to device selection and refresh.";
    case "wait-text-timeout":
    case "mute-unconfirmed":
    case "request-timeout":
    case "connection-lost":
      return "The operation may already have changed the iPhone. Inspect the current screen before repeating it.";
    default:
      return "Inspect the current screen before trying again. No input has been retried automatically.";
  }
}
