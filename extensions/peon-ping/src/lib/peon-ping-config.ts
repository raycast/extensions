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

export type PeonPingNotificationTemplateKey =
  | "stop"
  | "permission"
  | "error"
  | "idle"
  | "question";

export type PeonPingNotificationTemplates = Partial<
  Record<PeonPingNotificationTemplateKey, string>
>;

export type PeonPingPathRule = {
  pattern: string;
  pack: string;
};

export type PeonPingTrainerConfig = {
  enabled: boolean;
  exercises: Record<string, number>;
  reminderIntervalMinutes: number;
  reminderMinGapMinutes: number;
};

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
  packRotation: readonly string[];
  pathRules: readonly PeonPingPathRule[];
  useSoundEffectsDevice: boolean;
  silentWindowSeconds: number;
  sessionStartCooldownSeconds: number;
  suppressSubagentComplete: boolean;
  meetingDetect: boolean;
  notificationAllScreens: boolean;
  notificationTitleOverride: string;
  notificationTemplates: PeonPingNotificationTemplates;
  debugEnabled: boolean;
  debugRetentionDays: number;
  trainer: PeonPingTrainerConfig;
};

type RawMobileNotify = {
  enabled?: boolean;
  service?: string;
};

type RawPeonPingPathRule = {
  pattern?: string;
  pack?: string;
};

type RawPeonPingTrainerConfig = {
  enabled?: boolean;
  exercises?: Record<string, number>;
  reminder_interval_minutes?: number;
  reminder_min_gap_minutes?: number;
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
  pack_rotation?: string[];
  path_rules?: RawPeonPingPathRule[];
  use_sound_effects_device?: boolean;
  silent_window_seconds?: number;
  session_start_cooldown_seconds?: number;
  suppress_subagent_complete?: boolean;
  meeting_detect?: boolean;
  notification_all_screens?: boolean;
  notification_title_override?: string;
  notification_templates?: PeonPingNotificationTemplates;
  debug?: boolean;
  debug_retention_days?: number;
  trainer?: RawPeonPingTrainerConfig;
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

const NOTIFICATION_TEMPLATE_KEYS: PeonPingNotificationTemplateKey[] = [
  "stop",
  "permission",
  "error",
  "idle",
  "question",
];

const DEFAULT_TRAINER_EXERCISES: Record<string, number> = {
  pushups: 300,
  squats: 300,
};

function parseNotificationTemplates(
  rawTemplates: PeonPingNotificationTemplates | undefined,
): PeonPingNotificationTemplates {
  const templates: PeonPingNotificationTemplates = {};

  if (!rawTemplates) {
    return templates;
  }

  for (const key of NOTIFICATION_TEMPLATE_KEYS) {
    const value = rawTemplates[key];
    if (typeof value === "string") {
      templates[key] = value;
    }
  }

  return templates;
}

function parsePathRules(
  rawRules: RawPeonPingPathRule[] | undefined,
): readonly PeonPingPathRule[] {
  if (!rawRules) {
    return [];
  }

  return rawRules.filter(
    (rule): rule is PeonPingPathRule =>
      typeof rule.pattern === "string" && typeof rule.pack === "string",
  );
}

function parseTrainerConfig(
  rawTrainer: RawPeonPingTrainerConfig | undefined,
): PeonPingTrainerConfig {
  const exercises = {
    ...DEFAULT_TRAINER_EXERCISES,
    ...(rawTrainer?.exercises ?? {}),
  };

  return {
    enabled: rawTrainer?.enabled ?? false,
    exercises,
    reminderIntervalMinutes: rawTrainer?.reminder_interval_minutes ?? 20,
    reminderMinGapMinutes: rawTrainer?.reminder_min_gap_minutes ?? 5,
  };
}

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
    packRotation: o.pack_rotation ?? [],
    pathRules: parsePathRules(o.path_rules),
    useSoundEffectsDevice: o.use_sound_effects_device ?? false,
    silentWindowSeconds: o.silent_window_seconds ?? 0,
    sessionStartCooldownSeconds: o.session_start_cooldown_seconds ?? 30,
    suppressSubagentComplete: o.suppress_subagent_complete ?? false,
    meetingDetect: o.meeting_detect ?? false,
    notificationAllScreens: o.notification_all_screens ?? true,
    notificationTitleOverride: o.notification_title_override ?? "",
    notificationTemplates: parseNotificationTemplates(o.notification_templates),
    debugEnabled: o.debug ?? false,
    debugRetentionDays: o.debug_retention_days ?? 7,
    trainer: parseTrainerConfig(o.trainer),
  };
}
