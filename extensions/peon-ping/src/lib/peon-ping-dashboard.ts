import type {
  PeonPingCategoryKey,
  PeonPingConfig,
  PeonPingNotificationPosition,
  PeonPingNotificationStyle,
  PeonPingPackRotationMode,
} from "./peon-ping-config";
import type { InstalledPack } from "./peon-ping-packs";
import type { VolumeStep } from "./peon-ping-settings-list";
import {
  CATEGORY_KEYS_ORDER,
  CATEGORY_LABELS,
  formatDismiss,
  nextDismissSeconds,
  POSITION_CYCLE,
  POSITION_LABELS,
  ROTATION_LABELS,
  ROTATION_MODES_ORDER,
  STYLE_LABELS,
  VOLUME_STEPS,
  volumeLabel,
} from "./peon-ping-settings-list";

export type DashboardItemId =
  | "status"
  | "volume"
  | "voicePack"
  | "rotation"
  | "categories"
  | "notifications"
  | "audio";

export type MetadataLabel = {
  kind: "label";
  title: string;
  text?: string;
  textColor?: "green" | "red" | "secondary";
};

export type MetadataSeparator = { kind: "separator" };

export type MetadataTagListItem = {
  text: string;
  color?: "green" | "secondary";
};

export type MetadataTagList = {
  kind: "tagList";
  title: string;
  items: MetadataTagListItem[];
};

export type MetadataEntry = MetadataLabel | MetadataSeparator | MetadataTagList;

export type DashboardAction =
  | { kind: "toggleStatus"; title: string; nextEnabled: boolean }
  | { kind: "setVolume"; title: string; volume: VolumeStep }
  | { kind: "setActivePack"; title: string; packName: string }
  | { kind: "advanceToNextPack"; title: string }
  | {
      kind: "setRotationMode";
      title: string;
      mode: PeonPingPackRotationMode;
    }
  | {
      kind: "toggleCategory";
      title: string;
      categoryKey: PeonPingCategoryKey;
      nextEnabled: boolean;
    }
  | {
      kind: "toggleDesktopNotifications";
      title: string;
      nextEnabled: boolean;
    }
  | {
      kind: "setNotificationStyle";
      title: string;
      style: PeonPingNotificationStyle;
    }
  | {
      kind: "setNotificationPosition";
      title: string;
      position: PeonPingNotificationPosition;
    }
  | { kind: "cycleDismissTime"; title: string; nextSeconds: number }
  | {
      kind: "toggleMobileNotifications";
      title: string;
      nextEnabled: boolean;
    }
  | { kind: "toggleHeadphonesOnly"; title: string; nextEnabled: boolean };

export type DashboardItem = {
  id: DashboardItemId;
  title: string;
  icon: string;
  accessoryText: string;
  accessoryTagColor?: "green" | "red";
  metadata: MetadataEntry[];
  actions: DashboardAction[];
};

export type BuildDashboardInput = {
  config: PeonPingConfig;
  packs: InstalledPack[];
};

function findPackDisplayName(
  packs: InstalledPack[],
  activePack: string,
): string {
  const found = packs.find((p) => p.name === activePack);
  return found ? found.displayName : activePack;
}

function buildStatusItem(
  config: PeonPingConfig,
  packs: InstalledPack[],
): DashboardItem {
  const enabled = config.effectivelyEnabled;
  const enabledCount = CATEGORY_KEYS_ORDER.filter(
    (k) => config.categories[k],
  ).length;

  const metadata: MetadataEntry[] = [
    {
      kind: "label",
      title: "Status",
      text: enabled ? "On" : "Off",
      textColor: enabled ? "green" : "red",
    },
    {
      kind: "label",
      title: "Volume",
      text: `${Math.round(config.volume * 100)}%`,
    },
    {
      kind: "label",
      title: "Active Pack",
      text: findPackDisplayName(packs, config.activePack),
    },
    {
      kind: "label",
      title: "Rotation",
      text: ROTATION_LABELS[config.packRotationMode],
    },
    { kind: "separator" },
    {
      kind: "tagList",
      title: `Categories (${enabledCount}/${CATEGORY_KEYS_ORDER.length})`,
      items: CATEGORY_KEYS_ORDER.map((key) => ({
        text: CATEGORY_LABELS[key],
        color: config.categories[key]
          ? ("green" as const)
          : ("secondary" as const),
      })),
    },
  ];

  return {
    id: "status",
    title: "Peon Ping",
    icon: enabled ? "pause" : "play",
    accessoryText: enabled ? "On" : "Off",
    accessoryTagColor: enabled ? "green" : "red",
    metadata,
    actions: [
      {
        kind: "toggleStatus",
        title: enabled ? "Turn Peon Ping Off" : "Turn Peon Ping On",
        nextEnabled: !enabled,
      },
    ],
  };
}

function buildVolumeItem(config: PeonPingConfig): DashboardItem {
  const currentLabel = `${Math.round(config.volume * 100)}%`;

  const metadata: MetadataEntry[] = [
    { kind: "label", title: "Current Volume", text: currentLabel },
    { kind: "separator" },
    {
      kind: "tagList",
      title: "Levels",
      items: VOLUME_STEPS.map((step) => ({
        text: volumeLabel(step),
        color:
          config.volume === step ? ("green" as const) : ("secondary" as const),
      })),
    },
  ];

  return {
    id: "volume",
    title: "Volume",
    icon: "speakerOn",
    accessoryText: currentLabel,
    metadata,
    actions: VOLUME_STEPS.map((step) => ({
      kind: "setVolume" as const,
      title: `Set to ${volumeLabel(step)}`,
      volume: step,
    })),
  };
}

function buildVoicePackItem(
  config: PeonPingConfig,
  packs: InstalledPack[],
): DashboardItem {
  const activeDisplayName = findPackDisplayName(packs, config.activePack);

  const metadata: MetadataEntry[] = [
    {
      kind: "label",
      title: "Active",
      text: activeDisplayName,
      textColor: "green",
    },
    { kind: "separator" },
    ...packs.map(
      (pack): MetadataLabel => ({
        kind: "label",
        title: pack.displayName,
        text: pack.name === config.activePack ? "Active" : "",
        textColor: pack.name === config.activePack ? "green" : "secondary",
      }),
    ),
  ];

  const actions: DashboardAction[] = [
    ...packs.map(
      (pack): DashboardAction => ({
        kind: "setActivePack",
        title: `Use ${pack.displayName}`,
        packName: pack.name,
      }),
    ),
    { kind: "advanceToNextPack", title: "Next Pack" },
  ];

  return {
    id: "voicePack",
    title: "Voice Pack",
    icon: "music",
    accessoryText: activeDisplayName,
    metadata,
    actions,
  };
}

function buildRotationItem(config: PeonPingConfig): DashboardItem {
  const currentLabel = ROTATION_LABELS[config.packRotationMode];

  const metadata: MetadataEntry[] = [
    { kind: "label", title: "Current Mode", text: currentLabel },
    { kind: "separator" },
    {
      kind: "tagList",
      title: "Modes",
      items: ROTATION_MODES_ORDER.map((mode) => ({
        text: ROTATION_LABELS[mode],
        color:
          config.packRotationMode === mode
            ? ("green" as const)
            : ("secondary" as const),
      })),
    },
  ];

  return {
    id: "rotation",
    title: "Pack Rotation",
    icon: "arrowClockwise",
    accessoryText: currentLabel,
    metadata,
    actions: ROTATION_MODES_ORDER.map((mode) => ({
      kind: "setRotationMode" as const,
      title: ROTATION_LABELS[mode],
      mode,
    })),
  };
}

function buildCategoriesItem(config: PeonPingConfig): DashboardItem {
  const enabledCount = CATEGORY_KEYS_ORDER.filter(
    (k) => config.categories[k],
  ).length;

  const metadata: MetadataEntry[] = CATEGORY_KEYS_ORDER.map((key) => ({
    kind: "label" as const,
    title: CATEGORY_LABELS[key],
    text: config.categories[key] ? "On" : "Off",
    textColor: config.categories[key]
      ? ("green" as const)
      : ("secondary" as const),
  }));

  return {
    id: "categories",
    title: "Sound Categories",
    icon: "bulletPoints",
    accessoryText: `${enabledCount}/${CATEGORY_KEYS_ORDER.length} enabled`,
    metadata,
    actions: CATEGORY_KEYS_ORDER.map((key) => ({
      kind: "toggleCategory" as const,
      title: `${config.categories[key] ? "Disable" : "Enable"} ${CATEGORY_LABELS[key]}`,
      categoryKey: key,
      nextEnabled: !config.categories[key],
    })),
  };
}

function buildNotificationsItem(config: PeonPingConfig): DashboardItem {
  const metadata: MetadataEntry[] = [
    {
      kind: "label",
      title: "Desktop",
      text: config.desktopNotifications ? "On" : "Off",
      textColor: config.desktopNotifications ? "green" : "secondary",
    },
    {
      kind: "label",
      title: "Style",
      text: STYLE_LABELS[config.notificationStyle],
    },
    {
      kind: "label",
      title: "Position",
      text: POSITION_LABELS[config.notificationPosition],
    },
    {
      kind: "label",
      title: "Dismiss",
      text: formatDismiss(config.notificationDismissSeconds),
    },
  ];

  if (config.mobileNotifyConfigured) {
    metadata.push({
      kind: "label",
      title: "Mobile",
      text: config.mobileNotifyEnabled ? "On" : "Off",
      textColor: config.mobileNotifyEnabled ? "green" : "secondary",
    });
  }

  const actions: DashboardAction[] = [
    {
      kind: "toggleDesktopNotifications",
      title: config.desktopNotifications
        ? "Disable Desktop Notifications"
        : "Enable Desktop Notifications",
      nextEnabled: !config.desktopNotifications,
    },
    ...(
      ["overlay" as const, "standard" as const] as PeonPingNotificationStyle[]
    ).map(
      (style): DashboardAction => ({
        kind: "setNotificationStyle",
        title: `Style: ${STYLE_LABELS[style]}`,
        style,
      }),
    ),
    ...POSITION_CYCLE.map(
      (position): DashboardAction => ({
        kind: "setNotificationPosition",
        title: `Position: ${POSITION_LABELS[position]}`,
        position,
      }),
    ),
    {
      kind: "cycleDismissTime",
      title: `Dismiss: ${formatDismiss(nextDismissSeconds(config.notificationDismissSeconds))}`,
      nextSeconds: nextDismissSeconds(config.notificationDismissSeconds),
    },
  ];

  if (config.mobileNotifyConfigured) {
    actions.push({
      kind: "toggleMobileNotifications",
      title: config.mobileNotifyEnabled
        ? "Disable Mobile Notifications"
        : "Enable Mobile Notifications",
      nextEnabled: !config.mobileNotifyEnabled,
    });
  }

  return {
    id: "notifications",
    title: "Notifications",
    icon: "bell",
    accessoryText: config.desktopNotifications ? "Desktop On" : "Desktop Off",
    metadata,
    actions,
  };
}

function buildAudioItem(config: PeonPingConfig): DashboardItem {
  return {
    id: "audio",
    title: "Audio",
    icon: "headphones",
    accessoryText: config.headphonesOnly ? "Headphones Only" : "All Outputs",
    metadata: [
      {
        kind: "label",
        title: "Headphones Only",
        text: config.headphonesOnly ? "On" : "Off",
        textColor: config.headphonesOnly ? "green" : "secondary",
      },
    ],
    actions: [
      {
        kind: "toggleHeadphonesOnly",
        title: config.headphonesOnly
          ? "Disable Headphones Only"
          : "Enable Headphones Only",
        nextEnabled: !config.headphonesOnly,
      },
    ],
  };
}

export function buildDashboardItems(
  input: BuildDashboardInput,
): DashboardItem[] {
  const { config, packs } = input;
  return [
    buildStatusItem(config, packs),
    buildVolumeItem(config),
    buildVoicePackItem(config, packs),
    buildRotationItem(config),
    buildCategoriesItem(config),
    buildNotificationsItem(config),
    buildAudioItem(config),
  ];
}
