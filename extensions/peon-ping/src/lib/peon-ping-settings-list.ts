import type {
  PeonPingCategoryKey,
  PeonPingConfig,
  PeonPingNotificationPosition,
  PeonPingNotificationStyle,
  PeonPingPackRotationMode,
} from "./peon-ping-config";
import type { InstalledPack } from "./peon-ping-packs";

export type VolumeStep = 0.25 | 0.5 | 0.75 | 1.0;

export type StatusRowItem = {
  kind: "status";
  title: "Peon Ping";
  enabled: boolean;
  action: {
    kind: "toggleEnabled";
    nextEnabled: boolean;
    title: string;
  };
};

export type VolumeStepItem = {
  kind: "volumeStep";
  step: VolumeStep;
  label: string;
  isCurrent: boolean;
  action: { kind: "setVolume"; volume: VolumeStep };
};

export type VoicePackRowItem = {
  kind: "voicePack";
  packName: string;
  displayName: string;
  isActive: boolean;
  action: { kind: "setActivePack"; packName: string };
};

export type NextPackRowItem = {
  kind: "nextPack";
  title: "Next Pack →";
  action: { kind: "advanceToNextPack" };
};

export type RotationRowItem = {
  kind: "rotation";
  mode: PeonPingPackRotationMode;
  label: string;
  isCurrent: boolean;
  action: { kind: "setPackRotationMode"; mode: PeonPingPackRotationMode };
};

export type CategoryRowItem = {
  kind: "category";
  categoryKey: PeonPingCategoryKey;
  title: string;
  enabled: boolean;
  action: {
    kind: "toggleCategory";
    categoryKey: PeonPingCategoryKey;
    nextEnabled: boolean;
  };
};

export type DesktopNotificationsRowItem = {
  kind: "desktopNotifications";
  title: string;
  enabled: boolean;
  action: { kind: "setDesktopNotifications"; nextEnabled: boolean };
};

export type NotificationStyleAction = {
  kind: "setNotificationStyle";
  style: PeonPingNotificationStyle;
  title: string;
};

export type NotificationStyleRowItem = {
  kind: "notificationStyle";
  title: string;
  currentStyle: PeonPingNotificationStyle;
  actions: [NotificationStyleAction, NotificationStyleAction];
};

export type NotificationPositionAction = {
  kind: "setNotificationPosition";
  position: PeonPingNotificationPosition;
  title: string;
};

export type NotificationPositionRowItem = {
  kind: "notificationPosition";
  title: string;
  currentPosition: PeonPingNotificationPosition;
  actions: NotificationPositionAction[];
};

export type NotificationDismissRowItem = {
  kind: "notificationDismiss";
  title: string;
  dismissSeconds: number;
  action: {
    kind: "setNotificationDismissSeconds";
    nextSeconds: number;
  };
};

export type MobileNotificationsRowItem = {
  kind: "mobileNotifications";
  title: string;
  enabled: boolean;
  action: { kind: "setMobileNotifications"; nextEnabled: boolean };
};

export type HeadphonesOnlyRowItem = {
  kind: "headphonesOnly";
  title: string;
  enabled: boolean;
  action: { kind: "setHeadphonesOnly"; nextEnabled: boolean };
};

export type SettingsListItem =
  | StatusRowItem
  | VolumeStepItem
  | VoicePackRowItem
  | NextPackRowItem
  | RotationRowItem
  | CategoryRowItem
  | DesktopNotificationsRowItem
  | NotificationStyleRowItem
  | NotificationPositionRowItem
  | NotificationDismissRowItem
  | MobileNotificationsRowItem
  | HeadphonesOnlyRowItem;

export type SettingsSection = {
  title: string;
  items: SettingsListItem[];
};

export type BuildSettingsSectionsInput = {
  config: PeonPingConfig;
  packs: InstalledPack[];
};

export const VOLUME_STEPS: readonly VolumeStep[] = [0.25, 0.5, 0.75, 1.0];

export const CATEGORY_LABELS: Record<PeonPingCategoryKey, string> = {
  "session.start": "Session Start",
  "task.acknowledge": "Task Acknowledge",
  "task.complete": "Task Complete",
  "task.error": "Task Error",
  "input.required": "Input Required",
  "resource.limit": "Resource Limit",
  "user.spam": "User Spam",
};

export const CATEGORY_KEYS_ORDER = Object.keys(
  CATEGORY_LABELS,
) as PeonPingCategoryKey[];

export const ROTATION_LABELS: Record<PeonPingPackRotationMode, string> = {
  random: "Random",
  "round-robin": "Round Robin",
  session_override: "Session Override",
};

export const ROTATION_MODES_ORDER = Object.keys(
  ROTATION_LABELS,
) as PeonPingPackRotationMode[];

export const POSITION_CYCLE: readonly PeonPingNotificationPosition[] = [
  "top-center",
  "top-right",
  "top-left",
  "bottom-right",
  "bottom-left",
  "bottom-center",
];

export const POSITION_LABELS: Record<PeonPingNotificationPosition, string> = {
  "top-center": "Top Center",
  "top-right": "Top Right",
  "top-left": "Top Left",
  "bottom-right": "Bottom Right",
  "bottom-left": "Bottom Left",
  "bottom-center": "Bottom Center",
};

export const DISMISS_CYCLE = [2, 4, 8, 0] as const;

type DismissCycleSeconds = (typeof DISMISS_CYCLE)[number];

function isDismissCycleSeconds(value: number): value is DismissCycleSeconds {
  return (DISMISS_CYCLE as readonly number[]).includes(value);
}

export function nextDismissSeconds(current: number): number {
  if (isDismissCycleSeconds(current)) {
    const idx = DISMISS_CYCLE.indexOf(current);
    return DISMISS_CYCLE[(idx + 1) % DISMISS_CYCLE.length];
  }
  const strictlyGreater = DISMISS_CYCLE.filter((s) => s > current);
  if (strictlyGreater.length > 0) {
    return Math.min(...strictlyGreater);
  }
  return DISMISS_CYCLE[0];
}

export const STYLE_LABELS: Record<PeonPingNotificationStyle, string> = {
  overlay: "Overlay",
  standard: "Standard",
};

export function formatDismiss(seconds: number): string {
  return seconds === 0 ? "Persistent" : `${seconds}s`;
}

export function volumeLabel(step: VolumeStep): string {
  return `${Math.round(step * 100)}%`;
}

export function buildSettingsSections(
  input: BuildSettingsSectionsInput,
): SettingsSection[] {
  const { config, packs } = input;

  const statusSection: SettingsSection = {
    title: "Status",
    items: [
      {
        kind: "status",
        title: "Peon Ping",
        enabled: config.effectivelyEnabled,
        action: {
          kind: "toggleEnabled",
          nextEnabled: !config.effectivelyEnabled,
          title: config.effectivelyEnabled
            ? "Turn Peon Ping Off"
            : "Turn Peon Ping On",
        },
      },
    ],
  };

  const volumeSection: SettingsSection = {
    title: "Volume",
    items: VOLUME_STEPS.map((step) => ({
      kind: "volumeStep" as const,
      step,
      label: volumeLabel(step),
      isCurrent: config.volume === step,
      action: { kind: "setVolume" as const, volume: step },
    })),
  };

  const voicePackItems: SettingsListItem[] = [
    ...packs.map(
      (pack): VoicePackRowItem => ({
        kind: "voicePack",
        packName: pack.name,
        displayName: pack.displayName,
        isActive: config.activePack === pack.name,
        action: { kind: "setActivePack", packName: pack.name },
      }),
    ),
    {
      kind: "nextPack",
      title: "Next Pack →",
      action: { kind: "advanceToNextPack" },
    },
  ];

  const voicePackSection: SettingsSection = {
    title: "Voice Pack",
    items: voicePackItems,
  };

  const rotationSection: SettingsSection = {
    title: "Rotation",
    items: ROTATION_MODES_ORDER.map(
      (mode): RotationRowItem => ({
        kind: "rotation",
        mode,
        label: ROTATION_LABELS[mode],
        isCurrent: config.packRotationMode === mode,
        action: { kind: "setPackRotationMode", mode },
      }),
    ),
  };

  const soundCategoriesSection: SettingsSection = {
    title: "Sound Categories",
    items: CATEGORY_KEYS_ORDER.map(
      (key): CategoryRowItem => ({
        kind: "category",
        categoryKey: key,
        title: `${CATEGORY_LABELS[key]}: ${config.categories[key] ? "On" : "Off"}`,
        enabled: config.categories[key],
        action: {
          kind: "toggleCategory",
          categoryKey: key,
          nextEnabled: !config.categories[key],
        },
      }),
    ),
  };

  const notificationItems: SettingsListItem[] = [
    {
      kind: "desktopNotifications",
      title: `Desktop: ${config.desktopNotifications ? "On" : "Off"}`,
      enabled: config.desktopNotifications,
      action: {
        kind: "setDesktopNotifications",
        nextEnabled: !config.desktopNotifications,
      },
    },
    {
      kind: "notificationStyle",
      title: `Style: ${STYLE_LABELS[config.notificationStyle]}`,
      currentStyle: config.notificationStyle,
      actions: [
        {
          kind: "setNotificationStyle",
          style: "overlay",
          title: STYLE_LABELS.overlay,
        },
        {
          kind: "setNotificationStyle",
          style: "standard",
          title: STYLE_LABELS.standard,
        },
      ],
    },
    {
      kind: "notificationPosition",
      title: `Position: ${POSITION_LABELS[config.notificationPosition]}`,
      currentPosition: config.notificationPosition,
      actions: POSITION_CYCLE.map(
        (position): NotificationPositionAction => ({
          kind: "setNotificationPosition",
          position,
          title: POSITION_LABELS[position],
        }),
      ),
    },
    {
      kind: "notificationDismiss",
      title: `Dismiss: ${formatDismiss(config.notificationDismissSeconds)}`,
      dismissSeconds: config.notificationDismissSeconds,
      action: {
        kind: "setNotificationDismissSeconds",
        nextSeconds: nextDismissSeconds(config.notificationDismissSeconds),
      },
    },
  ];

  if (config.mobileNotifyConfigured) {
    notificationItems.push({
      kind: "mobileNotifications",
      title: `Mobile: ${config.mobileNotifyEnabled ? "On" : "Off"}`,
      enabled: config.mobileNotifyEnabled,
      action: {
        kind: "setMobileNotifications",
        nextEnabled: !config.mobileNotifyEnabled,
      },
    });
  }

  const notificationsSection: SettingsSection = {
    title: "Notifications",
    items: notificationItems,
  };

  const audioSection: SettingsSection = {
    title: "Audio",
    items: [
      {
        kind: "headphonesOnly",
        title: `Headphones Only: ${config.headphonesOnly ? "On" : "Off"}`,
        enabled: config.headphonesOnly,
        action: {
          kind: "setHeadphonesOnly",
          nextEnabled: !config.headphonesOnly,
        },
      },
    ],
  };

  return [
    statusSection,
    volumeSection,
    voicePackSection,
    rotationSection,
    soundCategoriesSection,
    notificationsSection,
    audioSection,
  ];
}
