import { HelperStatus, PermissionState } from "../domain/models";

export interface SetupPresentation {
  title: string;
  detail: string;
  accessory: string;
}
export type SetupActionKind =
  | "install"
  | "start"
  | "repair"
  | "requestPermissions"
  | "openInputMonitoring"
  | "openAccessibility"
  | "stop"
  | "signingGuidance"
  | "refresh";
export interface SetupActionPresentation {
  kind: SetupActionKind;
  title: string;
}

function permissionLabel(name: string, state: PermissionState): string {
  const label =
    state === "granted"
      ? "Ready"
      : state === "denied"
        ? "Needs Approval"
        : state === "notDetermined"
          ? "Not Set Up"
          : "Unavailable";
  return `${name}: ${label}`;
}

export function helperSetupPresentation(helper: HelperStatus): SetupPresentation {
  const permissions = [
    permissionLabel("Input Monitoring", helper.permissions.inputMonitoring),
    permissionLabel("Accessibility", helper.permissions.accessibility),
  ].join(" · ");
  switch (helper.state) {
    case "packagedIdentityInvalid":
    case "installedIdentityInvalid":
      return {
        title: "Signed Helper Required",
        detail: helper.detail ?? "A valid Apple-signed helper is required before setup can continue.",
        accessory: "Blocked",
      };
    case "running":
      return {
        title: "Helper Running",
        detail: `${permissions}. Running status is not physical scroll verification.`,
        accessory: "Running",
      };
    case "stopped":
      return { title: "Helper Ready for Permission Setup", detail: permissions, accessory: "Stopped" };
    case "notInstalled":
      return {
        title: "Helper Needs Installation",
        detail: `${permissions}. Install the signed helper before requesting permissions.`,
        accessory: "Setup Needed",
      };
    case "stale":
      return {
        title: "Helper Needs Cleanup",
        detail: `${permissions}. A stale helper process was found.`,
        accessory: "Attention",
      };
    case "identityMismatch":
      return {
        title: "Helper Runtime Mismatch",
        detail: `${permissions}. The running process does not match the installed helper.`,
        accessory: "Attention",
      };
  }
}

export function ambiguousIdentityPresentation(): SetupPresentation {
  return {
    title: "Profile Unavailable for This Mouse",
    detail:
      "This mouse does not report a stable serial number or location ID. Saving a profile could affect an identical mouse.",
    accessory: "Identity Ambiguous",
  };
}

function needsAttention(helper: HelperStatus): boolean {
  return helper.permissions.inputMonitoring !== "granted" || helper.permissions.accessibility !== "granted";
}

export function helperActionPresentation(helper?: HelperStatus): SetupActionPresentation[] {
  if (!helper) return [{ kind: "refresh", title: "Refresh Status" }];
  if (helper.state === "packagedIdentityInvalid" || helper.state === "installedIdentityInvalid")
    return [
      { kind: "signingGuidance", title: "View Signing Requirements" },
      { kind: "refresh", title: "Refresh Status" },
    ];
  const settings = [
    ...(helper.permissions.inputMonitoring === "denied"
      ? [{ kind: "openInputMonitoring" as const, title: "Open Input Monitoring Settings" }]
      : []),
    ...(helper.permissions.accessibility === "denied"
      ? [{ kind: "openAccessibility" as const, title: "Open Accessibility Settings" }]
      : []),
  ];
  switch (helper.state) {
    case "notInstalled":
      return [
        { kind: "install", title: "Install Helper" },
        { kind: "refresh", title: "Refresh Status" },
      ];
    case "stopped":
      if (settings.length) return [...settings, { kind: "refresh", title: "Refresh Status" }];
      if (needsAttention(helper))
        return [
          { kind: "requestPermissions", title: "Request macOS Permissions" },
          { kind: "refresh", title: "Refresh Status" },
        ];
      return [
        { kind: "start", title: "Start Helper" },
        { kind: "refresh", title: "Refresh Status" },
      ];
    case "running":
      return [...settings, { kind: "stop", title: "Stop Helper" }, { kind: "refresh", title: "Refresh Status" }];
    case "stale":
    case "identityMismatch":
      return [
        { kind: "repair", title: "Repair Helper" },
        { kind: "refresh", title: "Refresh Status" },
      ];
  }
}
