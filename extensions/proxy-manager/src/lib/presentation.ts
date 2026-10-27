import { Color, Icon } from "@raycast/api";
import { isWildcard } from "./host";
import type { AppRoutingMode, AppRuleKeyKind, Status } from "./types";

export interface StatePresentation {
  label: string;
  title: string;
  icon: Icon;
  tint: Color;
}

export function presentation(status: Status): StatePresentation {
  switch (status.state) {
    case "on":
      return { label: "ON", title: "Routing is on", icon: Icon.CheckCircle, tint: Color.Green };
    case "degraded":
      return {
        label: "DEGRADED",
        title: "Routing is degraded",
        icon: Icon.Warning,
        tint: Color.Orange,
      };
    case "starting":
      return {
        label: "STARTING",
        title: "Routing is starting…",
        icon: Icon.CircleProgress,
        tint: Color.Blue,
      };
    case "stopping":
      return {
        label: "STOPPING",
        title: "Routing is stopping…",
        icon: Icon.CircleProgress,
        tint: Color.Blue,
      };
    default:
      return {
        label: "OFF",
        title: "Routing is off",
        icon: Icon.Circle,
        tint: Color.SecondaryText,
      };
  }
}

export function isOn(status: Status): boolean {
  return status.state === "on" || status.state === "degraded";
}

export function listener(status: Status): string {
  return `${status.bindHost}:${status.port}`;
}

/** One line that explains the state in the HUD / toast. */
export function statusSummary(
  status: Status,
  enabledTargets: number,
  totalTargets: number,
): string {
  const targets = `${enabledTargets}/${totalTargets} ${totalTargets === 1 ? "target" : "targets"}`;
  if (status.state === "degraded") return "DEGRADED — tunnel down";
  if (status.state === "starting") return "starting…";
  if (status.state === "stopping") return "stopping…";
  if (status.state === "on") return `ON · ${targets}`;
  return `OFF · ${targets}`;
}

export function modeLabel(mode: AppRoutingMode | null): string {
  switch (mode) {
    case "TUNNEL":
      return "Tunnel all";
    case "TARGETS":
      return "Use targets";
    case "DIRECT":
      return "Direct all";
    default:
      return "Targets decide";
  }
}

export function modeDescription(mode: AppRoutingMode): string {
  switch (mode) {
    case "TUNNEL":
      return "Everything this app requests goes through the tunnel.";
    case "TARGETS":
      return "This app follows the target list like everything else.";
    case "DIRECT":
      return "This app never uses the tunnel.";
  }
}

export function modeColor(mode: AppRoutingMode | null): Color {
  switch (mode) {
    case "TUNNEL":
      return Color.Green;
    case "TARGETS":
      return Color.Blue;
    case "DIRECT":
      return Color.SecondaryText;
    default:
      return Color.SecondaryText;
  }
}

export function keyKindLabel(kind: AppRuleKeyKind): string {
  switch (kind) {
    case "BUNDLE":
      return "Bundle ID";
    case "EXECUTABLE":
      return "Executable path";
    case "EXECUTABLE_NAME":
      return "Executable name";
  }
}

export function targetIcon(pattern: string, enabled: boolean) {
  if (!enabled) return { source: Icon.CircleDisabled, tintColor: Color.SecondaryText };
  return {
    source: isWildcard(pattern) ? Icon.Globe : Icon.Link,
    tintColor: Color.PrimaryText,
  };
}

export function tunnelIcon(status: Status) {
  if (status.state === "off" || status.state === "stopping") {
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
  return status.tunnelUp
    ? { source: Icon.Bolt, tintColor: Color.Green }
    : { source: Icon.BoltDisabled, tintColor: Color.Orange };
}
