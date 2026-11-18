import { execFileSync } from "node:child_process";

/** macOS privacy permissions typing depends on. */
export type Permission = "accessibility" | "automation";

export interface PermissionDetails {
  title: string;
  message: string;
  settingsUrl: string;
}

// macOS 27 renamed the Accessibility pane to "Device Control and Data Access"; its settings URL anchor is unchanged.
function getAccessibilityPaneName() {
  try {
    const version = execFileSync("/usr/bin/sw_vers", ["-productVersion"], { encoding: "utf8" });
    return Number.parseInt(version, 10) >= 27 ? "Device Control and Data Access" : "Accessibility";
  } catch {
    return "Accessibility";
  }
}

export function getPermissionDetails(permission: Permission): PermissionDetails {
  if (permission === "accessibility") {
    return {
      title: "Raycast needs permission to control your Mac",
      message: `Enable Raycast in Privacy & Security → ${getAccessibilityPaneName()}, then try again.`,
      settingsUrl: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
    };
  }

  return {
    title: "Raycast needs permission to control System Events",
    message: "Enable System Events for Raycast in Privacy & Security → Automation, then try again.",
    settingsUrl: "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
  };
}

export class PermissionError extends Error {
  constructor(readonly permission: Permission) {
    super(`Missing ${permission} permission`);
    this.name = "PermissionError";
  }
}

/** Recognizes the errors System Events raises when a permission is missing. */
export function detectMissingPermission(errorOutput: string): Permission | null {
  if (/not allowed to send keystrokes/i.test(errorOutput)) return "accessibility";
  if (/-1743|not authori[sz]ed to send apple events/i.test(errorOutput)) return "automation";
  return null;
}
