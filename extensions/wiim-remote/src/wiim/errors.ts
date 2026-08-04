export type ErrorCode =
  | "DISCOVERY_FAILED"
  | "NETWORK_TIMEOUT"
  | "INVALID_RESPONSE"
  | "DEVICE_NOT_FOUND"
  | "INVALID_DEVICE_IP"
  | "COMMAND_FAILED"
  | "CERTIFICATE_ERROR"
  | "UNKNOWN_ERROR";

export interface ErrorHint {
  title: string;
  message: string;
  recoverySteps?: string[];
}

export class WiiMAPIError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode?: number,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "WiiMAPIError";
  }

  getHint(): ErrorHint {
    const hints: Record<ErrorCode, ErrorHint> = {
      DISCOVERY_FAILED: {
        title: "Device Discovery Failed",
        message: "Could not find WiiM device on your network.",
        recoverySteps: [
          "Ensure WiiM device is powered on and connected to WiFi",
          "Set device IP manually in extension settings",
        ],
      },
      NETWORK_TIMEOUT: {
        title: "Network Timeout",
        message: "Device did not respond within 5 seconds.",
        recoverySteps: ["Check device IP address is correct", "Verify WiiM device is online", "Try again"],
      },
      INVALID_RESPONSE: {
        title: "Invalid Response",
        message: "Device returned unexpected response format.",
        recoverySteps: ["Update WiiM device firmware", "Restart WiiM device", "Contact WiiM support"],
      },
      DEVICE_NOT_FOUND: {
        title: "Device Not Found",
        message: "WiiM device IP address is not configured.",
        recoverySteps: ["Set device IP in extension settings", "Or restart extension to trigger auto-discovery"],
      },
      INVALID_DEVICE_IP: {
        title: "Invalid Device IP",
        message: "The IP address configured in settings is invalid.",
        recoverySteps: [
          "Check IP address format (e.g., 192.168.1.100)",
          "Update in extension settings",
          "Or clear to use auto-discovery",
        ],
      },
      COMMAND_FAILED: {
        title: "Command Failed",
        message: "Device rejected the command.",
        recoverySteps: ["Try again", "Restart WiiM device if issue persists"],
      },
      CERTIFICATE_ERROR: {
        title: "Certificate Error",
        message: "Could not establish secure connection to device.",
        recoverySteps: ["This is normal for WiiM devices", "Connection will proceed without certificate verification"],
      },
      UNKNOWN_ERROR: {
        title: "Unknown Error",
        message: "An unexpected error occurred.",
        recoverySteps: ["Try again", "Restart WiiM device", "Contact WiiM support if issue persists"],
      },
    };

    return hints[this.code];
  }
}
