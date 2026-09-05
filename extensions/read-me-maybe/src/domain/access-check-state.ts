import { transitionSetupGate, type SetupDiagnostic, type Source } from "./unread-count";

export const accessCheckStatusKinds = ["success", "accessibilityRequired", "automationRequired"] as const;
export type AccessCheckStatusKind = (typeof accessCheckStatusKinds)[number];

export type AccessCheckStatus = {
  kind: AccessCheckStatusKind;
  checkedAt: Date;
};

export type AccessCheckState = {
  setupGate: boolean;
  accessCheckStatus?: AccessCheckStatus;
};

export type AccessStateMigration = {
  state: AccessCheckState;
  clearLegacyGate: boolean;
};

export type AccessCheckPrompt =
  | { kind: "noSources"; message: "No sources enabled" }
  | { kind: "required"; message: "Access check required" }
  | { kind: "accessibilityRequired"; message: "Accessibility access required" }
  | { kind: "automationRequired"; message: "Automation access required" };

export type PermissionFailure = Extract<SetupDiagnostic, { kind: "accessibilityRequired" | "automationRequired" }>;

export function accessCheckPrompt(
  state: AccessCheckState,
  sourceCount: number,
  livePermissionFailure?: PermissionFailure,
): AccessCheckPrompt {
  if (sourceCount === 0) return { kind: "noSources", message: "No sources enabled" };
  if (livePermissionFailure) return permissionFailurePrompt(livePermissionFailure);
  if (!state.setupGate && state.accessCheckStatus?.kind === "accessibilityRequired") {
    return { kind: "accessibilityRequired", message: "Accessibility access required" };
  }
  if (!state.setupGate && state.accessCheckStatus?.kind === "automationRequired") {
    return { kind: "automationRequired", message: "Automation access required" };
  }
  return { kind: "required", message: "Access check required" };
}

export function migrateAccessState(state: AccessCheckState): AccessStateMigration {
  if (state.setupGate && !state.accessCheckStatus) {
    return { state: { setupGate: false }, clearLegacyGate: true };
  }

  return { state, clearLegacyGate: false };
}

export function permissionFailureOf(diagnostic: SetupDiagnostic): PermissionFailure | undefined {
  return diagnostic.kind === "accessibilityRequired" || diagnostic.kind === "automationRequired"
    ? diagnostic
    : undefined;
}

function permissionFailurePrompt(failure: PermissionFailure): AccessCheckPrompt {
  return failure.kind === "accessibilityRequired"
    ? { kind: failure.kind, message: "Accessibility access required" }
    : { kind: failure.kind, message: "Automation access required" };
}

export function recordBackgroundAccessResult(current: AccessCheckState, scan: SetupDiagnostic): AccessCheckState {
  return permissionFailureOf(scan) ? { ...current, setupGate: false } : current;
}

export function recordExplicitAccessCheck(
  current: AccessCheckState,
  sources: Source[],
  diagnostic: SetupDiagnostic,
  checkedAt: Date,
): AccessCheckState {
  const setupGate = transitionSetupGate(current.setupGate, sources, diagnostic);
  if (diagnostic.kind === "failed" || sources.length === 0) {
    return { ...current, setupGate };
  }

  const accessCheckStatus: AccessCheckStatus = { kind: diagnostic.kind, checkedAt };
  return { setupGate, accessCheckStatus };
}
