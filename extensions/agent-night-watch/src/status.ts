export type StatusKind =
  "off" | "starting" | "on-owned" | "stopping" | "on-external";
export type SessionPhase = "starting" | "running" | "stopping";

export interface NightWatchStatus {
  kind: StatusKind;
  sleepDisabled: boolean;
  message: string;
}

export interface StatusSnapshot {
  sleepDisabled: boolean;
  statePresent: boolean;
  processMatches: boolean;
  ready: boolean;
  stopped: boolean;
  stopRequested: boolean;
  phase?: SessionPhase;
}

export function parseSleepDisabled(pmsetOutput: string): boolean {
  return /^\s*SleepDisabled\s+1\s*$/m.test(pmsetOutput);
}

export function classifyNightWatchStatus(snapshot: StatusSnapshot): StatusKind {
  if (!snapshot.statePresent) {
    return snapshot.sleepDisabled ? "on-external" : "off";
  }

  if (!snapshot.sleepDisabled) {
    return snapshot.phase === "starting" &&
      snapshot.processMatches &&
      !snapshot.stopped
      ? "starting"
      : "off";
  }

  if (snapshot.processMatches && snapshot.ready) {
    return snapshot.phase === "stopping" || snapshot.stopRequested
      ? "stopping"
      : "on-owned";
  }

  if (
    snapshot.processMatches &&
    snapshot.phase === "starting" &&
    !snapshot.stopped
  ) {
    return "starting";
  }
  return "on-external";
}

export function statusMessage(kind: StatusKind): string {
  switch (kind) {
    case "off":
      return "Off — closing the lid will sleep normally";
    case "starting":
      return "Waiting for administrator authorization";
    case "on-owned":
      return "On — agents keep running with the lid closed";
    case "stopping":
      return "Restoring normal sleep";
    case "on-external":
      return "Sleep is disabled by another tool or leftover state";
  }
}

export function isAuthorizationCanceled(message: string): boolean {
  return /User canceled|用户取消|-128/.test(message);
}
