/**
 * The only place that maps the Raycast-free severity vocabulary to Raycast colours and icons.
 * Keeping it here is what lets src/lib/model/status.ts stay unit-testable without the runtime.
 */

import { Color, Icon } from "@raycast/api";
import {
  healthSeverity,
  operationSeverity,
  syncSeverity,
  type HealthStatus,
  type OperationPhase,
  type Severity,
  type SyncStatus,
} from "../lib/model/status";
import type { Environment } from "../lib/config/instances";
import type { Reachability } from "../lib/argocd/probe";

const SEVERITY_COLOR: Record<Severity, Color> = {
  ok: Color.Green,
  warn: Color.Yellow,
  error: Color.Red,
  info: Color.Blue,
  muted: Color.SecondaryText,
};

const HEALTH_ICON: Record<HealthStatus, Icon> = {
  Healthy: Icon.Heart,
  Progressing: Icon.CircleProgress50,
  Degraded: Icon.HeartDisabled,
  Suspended: Icon.Pause,
  Missing: Icon.QuestionMarkCircle,
  Unknown: Icon.QuestionMarkCircle,
};

const SYNC_ICON: Record<SyncStatus, Icon> = {
  Synced: Icon.CheckCircle,
  OutOfSync: Icon.ArrowClockwise,
  Unknown: Icon.QuestionMarkCircle,
};

const PHASE_ICON: Record<OperationPhase, Icon> = {
  Running: Icon.CircleProgress50,
  Succeeded: Icon.CheckCircle,
  Failed: Icon.XMarkCircle,
  Error: Icon.XMarkCircle,
  Terminating: Icon.Stop,
};

/** Production is red on purpose: the environment badge is the one thing not to misread. */
const ENVIRONMENT_COLOR: Record<Environment, Color> = {
  prod: Color.Red,
  preprod: Color.Orange,
  dev: Color.Blue,
};

export function severityColor(severity: Severity): Color {
  return SEVERITY_COLOR[severity];
}

export function healthIcon(health: HealthStatus): { source: Icon; tintColor: Color } {
  return { source: HEALTH_ICON[health], tintColor: severityColor(healthSeverity(health)) };
}

export function syncIcon(sync: SyncStatus): { source: Icon; tintColor: Color } {
  return { source: SYNC_ICON[sync], tintColor: severityColor(syncSeverity(sync)) };
}

export function phaseIcon(phase: OperationPhase): { source: Icon; tintColor: Color } {
  return { source: PHASE_ICON[phase], tintColor: severityColor(operationSeverity(phase)) };
}

export function environmentColor(env: Environment): Color {
  return ENVIRONMENT_COLOR[env];
}

export function reachabilityIcon(reachability: Reachability): { source: Icon; tintColor: Color } {
  switch (reachability.state) {
    case "reachable":
      return {
        source: Icon.CircleFilled,
        tintColor: isProbeSuspicious(reachability) ? Color.Orange : Color.Green,
      };
    case "unreachable":
      return { source: Icon.CircleFilled, tintColor: Color.Red };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

export function reachabilityText(reachability: Reachability): string {
  switch (reachability.state) {
    case "reachable": {
      const parts = [
        reachability.version,
        reachability.latencyMs === undefined ? undefined : `${reachability.latencyMs} ms`,
      ].filter(Boolean);
      const measured = parts.join(" in ") || "reachable";
      // A reachable probe with a non-2xx status used to render as a bare latency, which is how
      // a wrong probe path went unnoticed. The status is always shown now.
      return reachability.reason ? `${measured}, ${reachability.reason}` : measured;
    }
    case "unreachable":
      return `unreachable, check your VPN${reachability.reason ? ` (${reachability.reason})` : ""}`;
    default:
      return "not checked yet";
  }
}

/**
 * A reachable instance that answered something other than 2xx, or answered without a version,
 * is not healthy: it is a wrong URL, a proxy in the way, or a broken server. The dot turns
 * amber so it never reads as "all good".
 */
export function isProbeSuspicious(reachability: Reachability): boolean {
  return reachability.state === "reachable" && (reachability.reason !== undefined || !reachability.version);
}

/** "3 minutes ago", for a cache age. Rendered under every instance section. */
export function humanAge(seconds: number): string {
  if (seconds < 10) {
    return "just now";
  }
  if (seconds < 90) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) {
    return `${minutes} min ago`;
  }
  return `${Math.round(minutes / 60)} h ago`;
}
