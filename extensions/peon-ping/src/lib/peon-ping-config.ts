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

type RawMobileNotify = {
  enabled?: boolean;
  service?: string;
};

export type RawPeonPingConfig = {
  enabled?: boolean;
  volume?: number;
  default_pack?: string;
  active_pack?: string;
  desktop_notifications?: boolean;
  headphones_only?: boolean;
  pack_rotation_mode?: string;
  categories?: Partial<Record<PeonPingCategoryKey, boolean>>;
  notification_style?: string;
  notification_position?: string;
  notification_dismiss_seconds?: number;
  mobile_notify?: RawMobileNotify;
};

function parseConfigFile(configFilePath: string): RawPeonPingConfig {
  const raw = readFileSync(configFilePath, "utf8");
  return JSON.parse(raw) as RawPeonPingConfig;
}

export function getPeonPingStatus(
  configFilePath: string,
  pausedFilePath: string,
): PeonPingStatus {
  const o = parseConfigFile(configFilePath);
  if (typeof o.enabled !== "boolean") {
    throw new Error("peon-ping config is missing boolean enabled");
  }
  const paused = existsSync(pausedFilePath);
  return { enabled: o.enabled && !paused };
}

const DEFAULT_CATEGORIES: Record<PeonPingCategoryKey, boolean> = {
  "session.start": true,
  "task.acknowledge": false,
  "task.complete": true,
  "task.error": true,
  "input.required": true,
  "resource.limit": true,
  "user.spam": true,
};

const CATEGORY_KEYS: PeonPingCategoryKey[] = Object.keys(
  DEFAULT_CATEGORIES,
) as PeonPingCategoryKey[];

const PACK_ROTATION_MODES: PeonPingPackRotationMode[] = [
  "random",
  "round-robin",
  "session_override",
];

const NOTIFICATION_STYLES: PeonPingNotificationStyle[] = [
  "overlay",
  "standard",
];

const NOTIFICATION_POSITIONS: PeonPingNotificationPosition[] = [
  "top-center",
  "top-right",
  "top-left",
  "bottom-right",
  "bottom-left",
  "bottom-center",
];

export function getPeonPingConfig(
  configFilePath: string,
  pausedFilePath: string,
): PeonPingConfig {
  const o = parseConfigFile(configFilePath);
  if (typeof o.enabled !== "boolean") {
    throw new Error("peon-ping config is missing boolean enabled");
  }

  const paused = existsSync(pausedFilePath);

  const rawCategories = o.categories ?? {};
  const categories = {} as Record<PeonPingCategoryKey, boolean>;
  for (const key of CATEGORY_KEYS) {
    categories[key] = rawCategories[key] ?? DEFAULT_CATEGORIES[key];
  }

  const mobileNotify = o.mobile_notify;
  const mobileNotifyConfigured =
    mobileNotify !== undefined && typeof mobileNotify.service === "string";
  const mobileNotifyEnabled =
    mobileNotifyConfigured && mobileNotify!.enabled === true;

  return {
    effectivelyEnabled: o.enabled && !paused,
    volume: o.volume ?? 0.5,
    activePack: o.default_pack ?? o.active_pack ?? "peon",
    desktopNotifications: o.desktop_notifications ?? true,
    headphonesOnly: o.headphones_only ?? false,
    packRotationMode: PACK_ROTATION_MODES.includes(
      o.pack_rotation_mode as PeonPingPackRotationMode,
    )
      ? (o.pack_rotation_mode as PeonPingPackRotationMode)
      : "random",
    categories,
    notificationStyle: NOTIFICATION_STYLES.includes(
      o.notification_style as PeonPingNotificationStyle,
    )
      ? (o.notification_style as PeonPingNotificationStyle)
      : "overlay",
    notificationPosition: NOTIFICATION_POSITIONS.includes(
      o.notification_position as PeonPingNotificationPosition,
    )
      ? (o.notification_position as PeonPingNotificationPosition)
      : "top-center",
    notificationDismissSeconds: o.notification_dismiss_seconds ?? 4,
    mobileNotifyEnabled,
    mobileNotifyConfigured,
  };
}
