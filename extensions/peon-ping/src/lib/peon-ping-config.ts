import { existsSync, readFileSync } from "node:fs";

export type PeonPingStatus = {
  enabled: boolean;
};

export type PeonPingCategoryKey =
  | "session.start"
  | "task.acknowledge"
  | "task.complete"
  | "task.error"
  | "input.required"
  | "resource.limit"
  | "user.spam";

export type PeonPingPackRotationMode =
  | "random"
  | "round-robin"
  | "session_override";

export type PeonPingNotificationStyle = "overlay" | "standard";

export type PeonPingNotificationPosition =
  | "top-center"
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center";

export type PeonPingConfig = {
  effectivelyEnabled: boolean;
  volume: number;
  activePack: string;
  desktopNotifications: boolean;
  headphonesOnly: boolean;
  packRotationMode: PeonPingPackRotationMode;
  categories: Record<PeonPingCategoryKey, boolean>;
  notificationStyle: PeonPingNotificationStyle;
  notificationPosition: PeonPingNotificationPosition;
  notificationDismissSeconds: number;
  mobileNotifyEnabled: boolean;
  mobileNotifyConfigured: boolean;
};

export function getPeonPingStatus(
  configFilePath: string,
  pausedFilePath: string,
): PeonPingStatus {
  const raw = readFileSync(configFilePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error("peon-ping config is missing boolean enabled");
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.enabled !== "boolean") {
    throw new Error("peon-ping config is missing boolean enabled");
  }
  const paused = existsSync(pausedFilePath);
  return { enabled: o.enabled && !paused };
}

export function getPeonPingConfig(
  _configFilePath: string,
  _pausedFilePath: string,
): PeonPingConfig {
  throw new Error("Not implemented");
}
