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
  formatPackCount,
  formatDismiss,
  formatRuleCount,
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
  | "rotationPacks"
  | "pathRules"
  | "categories"
  | "notifications"
  | "behavior"
  | "audio"
  | "debug"
  | "trainer";

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

type DashboardActionBase = {
  title: string;
  subListTitle?: string;
  isCurrent?: boolean;
};

export type DashboardAction =
  | (DashboardActionBase & {
      kind: "toggleStatus";
      nextEnabled: boolean;
    })
  | (DashboardActionBase & { kind: "setVolume"; volume: VolumeStep })
  | (DashboardActionBase & { kind: "setActivePack"; packName: string })
  | (DashboardActionBase & { kind: "advanceToNextPack" })
  | (DashboardActionBase & {
      kind: "setRotationMode";
      mode: PeonPingPackRotationMode;
    })
  | (DashboardActionBase & {
      kind: "addPackToRotation";
      packName: string;
    })
  | (DashboardActionBase & {
      kind: "removePackFromRotation";
      packName: string;
    })
  | (DashboardActionBase & { kind: "clearPackRotation" })
  | (DashboardActionBase & {
      kind: "removePathRule";
      pattern: string;
    })
  | (DashboardActionBase & {
      kind: "setPathRulePack";
      pattern: string;
      packName: string;
    })
  | (DashboardActionBase & {
      kind: "toggleCategory";
      categoryKey: PeonPingCategoryKey;
      nextEnabled: boolean;
    })
  | (DashboardActionBase & {
      kind: "toggleDesktopNotifications";
      nextEnabled: boolean;
    })
  | (DashboardActionBase & {
      kind: "setNotificationStyle";
      style: PeonPingNotificationStyle;
    })
  | (DashboardActionBase & {
      kind: "setNotificationPosition";
      position: PeonPingNotificationPosition;
    })
  | (DashboardActionBase & {
      kind: "cycleDismissTime";
      nextSeconds: number;
    })
  | (DashboardActionBase & {
      kind: "toggleMobileNotifications";
      nextEnabled: boolean;
    })
  | (DashboardActionBase & {
      kind: "toggleHeadphonesOnly";
      nextEnabled: boolean;
    })
  | (DashboardActionBase & {
      kind: "toggleUseSoundEffectsDevice";
      nextEnabled: boolean;
    })
  | (DashboardActionBase & {
      kind: "toggleNotificationAllScreens";
      nextEnabled: boolean;
    })
  | (DashboardActionBase & {
      kind: "toggleMeetingDetect";
      nextEnabled: boolean;
    })
  | (DashboardActionBase & {
      kind: "setSilentWindowSeconds";
      seconds: number;
    })
  | (DashboardActionBase & {
      kind: "setSessionStartCooldownSeconds";
      seconds: number;
    })
  | (DashboardActionBase & {
      kind: "toggleSuppressSubagentComplete";
      nextEnabled: boolean;
    })
  | (DashboardActionBase & {
      kind: "toggleDebugEnabled";
      nextEnabled: boolean;
    })
  | (DashboardActionBase & {
      kind: "toggleTrainerEnabled";
      nextEnabled: boolean;
    })
  | (DashboardActionBase & {
      kind: "setTrainerExerciseGoal";
      exercise: string;
      goal: number;
    })
  | (DashboardActionBase & {
      kind: "setTrainerReminderIntervalMinutes";
      minutes: number;
    })
  | (DashboardActionBase & {
      kind: "setTrainerReminderMinGapMinutes";
      minutes: number;
    });

export type DashboardItem = {
  id: string;
  title: string;
  icon: string;
  accessoryText: string;
  accessoryTagColor?: "green" | "red";
  drillable: boolean;
  subItems?: DashboardItem[];
  metadata: MetadataEntry[];
  actions: DashboardAction[];
};

export type BuildDashboardInput = {
  config: PeonPingConfig;
  packs: InstalledPack[];
};

const PROGRESS_BAR_BLOCKS = 12;
const SILENT_WINDOW_OPTIONS = [0, 5, 10, 15, 30, 60, 120] as const;
const SESSION_START_COOLDOWN_OPTIONS = [0, 10, 30, 60, 120, 300] as const;
const TRAINER_REMINDER_INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;
const TRAINER_REMINDER_MIN_GAP_OPTIONS = [0, 5, 10, 15, 20, 30] as const;
const DEFAULT_TRAINER_GOAL_OPTIONS = [
  25, 50, 75, 100, 150, 200, 300, 500,
] as const;

export function progressBar(fraction: number): string {
  const filled = Math.round(fraction * PROGRESS_BAR_BLOCKS);
  const empty = PROGRESS_BAR_BLOCKS - filled;
  return "■".repeat(filled) + "□".repeat(empty);
}

function formatSecondsOption(seconds: number): string {
  return seconds === 0 ? "Off" : `${seconds}s`;
}

function formatMinutesOption(minutes: number): string {
  return `${minutes} min`;
}

function formatGoalOption(goal: number): string {
  return `${goal} reps`;
}

function trainerGoalOptions(currentGoal: number): number[] {
  return [...new Set([...DEFAULT_TRAINER_GOAL_OPTIONS, currentGoal])].sort(
    (left, right) => left - right,
  );
}

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
      text: `${progressBar(config.volume)} ${Math.round(config.volume * 100)}%`,
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
    drillable: false,
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
    {
      kind: "label",
      title: "Volume",
      text: `${progressBar(config.volume)} ${currentLabel}`,
    },
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
    drillable: true,
    metadata,
    actions: VOLUME_STEPS.map((step) => ({
      kind: "setVolume" as const,
      title: `Set to ${volumeLabel(step)}`,
      subListTitle: volumeLabel(step),
      isCurrent: config.volume === step,
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
        subListTitle: pack.displayName,
        isCurrent: pack.name === config.activePack,
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
    drillable: true,
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
    drillable: true,
    metadata,
    actions: ROTATION_MODES_ORDER.map((mode) => ({
      kind: "setRotationMode" as const,
      title: ROTATION_LABELS[mode],
      isCurrent: config.packRotationMode === mode,
      mode,
    })),
  };
}

function buildRotationPacksItem(
  config: PeonPingConfig,
  packs: InstalledPack[],
): DashboardItem {
  const metadata: MetadataEntry[] =
    config.packRotation.length === 0
      ? [
          {
            kind: "label",
            title: "Rotation Packs",
            text: "None configured",
            textColor: "secondary",
          },
        ]
      : config.packRotation.map(
          (packName, index): MetadataLabel => ({
            kind: "label",
            title: String(index + 1),
            text: findPackDisplayName(packs, packName),
            textColor: "green",
          }),
        );

  const actions: DashboardAction[] = [
    ...config.packRotation.map(
      (packName): DashboardAction => ({
        kind: "removePackFromRotation",
        title: `Remove ${findPackDisplayName(packs, packName)}`,
        subListTitle: findPackDisplayName(packs, packName),
        isCurrent: true,
        packName,
      }),
    ),
    ...packs
      .filter((pack) => !config.packRotation.includes(pack.name))
      .map(
        (pack): DashboardAction => ({
          kind: "addPackToRotation",
          title: `Add ${pack.displayName}`,
          subListTitle: pack.displayName,
          isCurrent: false,
          packName: pack.name,
        }),
      ),
  ];

  if (config.packRotation.length > 0) {
    actions.push({
      kind: "clearPackRotation",
      title: "Clear Rotation",
    });
  }

  return {
    id: "rotationPacks",
    title: "Rotation Packs",
    icon: "arrowClockwise",
    accessoryText: formatPackCount(config.packRotation.length),
    drillable: true,
    metadata,
    actions,
  };
}

function buildPathRulesItem(
  config: PeonPingConfig,
  packs: InstalledPack[],
): DashboardItem {
  const metadata: MetadataEntry[] =
    config.pathRules.length === 0
      ? [
          {
            kind: "label",
            title: "Path Rules",
            text: "None configured",
            textColor: "secondary",
          },
        ]
      : config.pathRules.map(
          (rule): MetadataLabel => ({
            kind: "label",
            title: rule.pattern,
            text: findPackDisplayName(packs, rule.pack),
            textColor: "green",
          }),
        );

  const subItems: DashboardItem[] =
    config.pathRules.length === 0
      ? [
          {
            id: "path-rules-empty",
            title: "No Path Rules",
            icon: "bulletPoints",
            accessoryText: "Manage in CLI",
            drillable: false,
            metadata: [
              {
                kind: "label",
                title: "Status",
                text: "No path rules configured",
                textColor: "secondary",
              },
              {
                kind: "label",
                title: "Add Rules",
                text: "Use peon packs bind or peon packs bind --pattern",
              },
            ],
            actions: [],
          },
        ]
      : config.pathRules.map((rule) => ({
          id: `path-rule-${rule.pattern}`,
          title: rule.pattern,
          icon: "bulletPoints",
          accessoryText: findPackDisplayName(packs, rule.pack),
          drillable: true,
          metadata: [
            {
              kind: "label",
              title: "Pattern",
              text: rule.pattern,
            },
            {
              kind: "label",
              title: "Pack",
              text: findPackDisplayName(packs, rule.pack),
              textColor: "green",
            },
          ],
          actions: [
            ...packs.map((pack) => ({
              kind: "setPathRulePack" as const,
              title: `Use ${pack.displayName}`,
              subListTitle: pack.displayName,
              isCurrent: rule.pack === pack.name,
              pattern: rule.pattern,
              packName: pack.name,
            })),
            {
              kind: "removePathRule" as const,
              title: `Remove ${rule.pattern}`,
              pattern: rule.pattern,
            },
          ],
        }));

  return {
    id: "pathRules",
    title: "Path Rules",
    icon: "bulletPoints",
    accessoryText: formatRuleCount(config.pathRules.length),
    drillable: true,
    subItems,
    metadata,
    actions: [],
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
    drillable: true,
    metadata,
    actions: CATEGORY_KEYS_ORDER.map((key) => ({
      kind: "toggleCategory" as const,
      title: `${config.categories[key] ? "Disable" : "Enable"} ${CATEGORY_LABELS[key]}`,
      subListTitle: CATEGORY_LABELS[key],
      isCurrent: config.categories[key],
      categoryKey: key,
      nextEnabled: !config.categories[key],
    })),
  };
}

function buildNotificationSubItems(config: PeonPingConfig): DashboardItem[] {
  const items: DashboardItem[] = [
    {
      id: "notif-desktop",
      title: "Desktop Notifications",
      icon: "bell",
      accessoryText: config.desktopNotifications ? "On" : "Off",
      accessoryTagColor: config.desktopNotifications ? "green" : "red",
      drillable: false,
      metadata: [
        {
          kind: "label",
          title: "Desktop Notifications",
          text: config.desktopNotifications ? "On" : "Off",
          textColor: config.desktopNotifications ? "green" : "secondary",
        },
      ],
      actions: [
        {
          kind: "toggleDesktopNotifications",
          title: config.desktopNotifications
            ? "Disable Desktop Notifications"
            : "Enable Desktop Notifications",
          nextEnabled: !config.desktopNotifications,
        },
      ],
    },
    {
      id: "notif-style",
      title: "Style",
      icon: "appWindowSidebarRight",
      accessoryText: STYLE_LABELS[config.notificationStyle],
      drillable: true,
      metadata: [
        {
          kind: "label",
          title: "Current Style",
          text: STYLE_LABELS[config.notificationStyle],
        },
        { kind: "separator" },
        {
          kind: "tagList",
          title: "Options",
          items: (["overlay", "standard"] as PeonPingNotificationStyle[]).map(
            (s) => ({
              text: STYLE_LABELS[s],
              color:
                config.notificationStyle === s
                  ? ("green" as const)
                  : ("secondary" as const),
            }),
          ),
        },
      ],
      actions: (["overlay", "standard"] as PeonPingNotificationStyle[]).map(
        (style) => ({
          kind: "setNotificationStyle" as const,
          title: `Set ${STYLE_LABELS[style]}`,
          subListTitle: STYLE_LABELS[style],
          isCurrent: config.notificationStyle === style,
          style,
        }),
      ),
    },
    {
      id: "notif-position",
      title: "Position",
      icon: "window",
      accessoryText: POSITION_LABELS[config.notificationPosition],
      drillable: true,
      metadata: [
        {
          kind: "label",
          title: "Current Position",
          text: POSITION_LABELS[config.notificationPosition],
        },
        { kind: "separator" },
        {
          kind: "tagList",
          title: "Positions",
          items: POSITION_CYCLE.map((p) => ({
            text: POSITION_LABELS[p],
            color:
              config.notificationPosition === p
                ? ("green" as const)
                : ("secondary" as const),
          })),
        },
      ],
      actions: POSITION_CYCLE.map((position) => ({
        kind: "setNotificationPosition" as const,
        title: `Set ${POSITION_LABELS[position]}`,
        subListTitle: POSITION_LABELS[position],
        isCurrent: config.notificationPosition === position,
        position,
      })),
    },
    {
      id: "notif-all-screens",
      title: "All Screens",
      icon: "window",
      accessoryText: config.notificationAllScreens ? "On" : "Off",
      accessoryTagColor: config.notificationAllScreens ? "green" : "red",
      drillable: false,
      metadata: [
        {
          kind: "label",
          title: "All Screens",
          text: config.notificationAllScreens ? "On" : "Off",
          textColor: config.notificationAllScreens ? "green" : "secondary",
        },
      ],
      actions: [
        {
          kind: "toggleNotificationAllScreens",
          title: config.notificationAllScreens
            ? "Disable All Screens"
            : "Enable All Screens",
          nextEnabled: !config.notificationAllScreens,
        },
      ],
    },
    {
      id: "notif-dismiss",
      title: "Auto-Dismiss",
      icon: "clock",
      accessoryText: formatDismiss(config.notificationDismissSeconds),
      drillable: false,
      metadata: [
        {
          kind: "label",
          title: "Current",
          text: formatDismiss(config.notificationDismissSeconds),
        },
        {
          kind: "label",
          title: "Next",
          text: formatDismiss(
            nextDismissSeconds(config.notificationDismissSeconds),
          ),
        },
      ],
      actions: [
        {
          kind: "cycleDismissTime" as const,
          title: `Cycle to ${formatDismiss(nextDismissSeconds(config.notificationDismissSeconds))}`,
          nextSeconds: nextDismissSeconds(config.notificationDismissSeconds),
        },
      ],
    },
  ];

  if (config.mobileNotifyConfigured) {
    items.push({
      id: "notif-mobile",
      title: "Mobile Notifications",
      icon: "mobile",
      accessoryText: config.mobileNotifyEnabled ? "On" : "Off",
      accessoryTagColor: config.mobileNotifyEnabled ? "green" : "red",
      drillable: false,
      metadata: [
        {
          kind: "label",
          title: "Mobile Notifications",
          text: config.mobileNotifyEnabled ? "On" : "Off",
          textColor: config.mobileNotifyEnabled ? "green" : "secondary",
        },
      ],
      actions: [
        {
          kind: "toggleMobileNotifications",
          title: config.mobileNotifyEnabled
            ? "Disable Mobile Notifications"
            : "Enable Mobile Notifications",
          nextEnabled: !config.mobileNotifyEnabled,
        },
      ],
    });
  }

  return items;
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
    {
      kind: "label",
      title: "Title Override",
      text: config.notificationTitleOverride || "Auto",
    },
    {
      kind: "label",
      title: "Templates",
      text:
        Object.keys(config.notificationTemplates).length === 0
          ? "Default"
          : `${Object.keys(config.notificationTemplates).length} customized`,
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

  return {
    id: "notifications",
    title: "Notifications",
    icon: "bell",
    accessoryText: config.desktopNotifications ? "Desktop On" : "Desktop Off",
    drillable: true,
    subItems: buildNotificationSubItems(config),
    metadata,
    actions: [],
  };
}

function buildAudioItem(config: PeonPingConfig): DashboardItem {
  return {
    id: "audio",
    title: "Audio",
    icon: "headphones",
    accessoryText: config.headphonesOnly ? "Headphones Only" : "All Outputs",
    drillable: true,
    subItems: [
      {
        id: "audio-headphones",
        title: "Headphones Only",
        icon: "headphones",
        accessoryText: config.headphonesOnly ? "On" : "Off",
        accessoryTagColor: config.headphonesOnly ? "green" : "red",
        drillable: false,
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
      },
      {
        id: "audio-effects-device",
        title: "Sound Effects Device",
        icon: "speakerOn",
        accessoryText: config.useSoundEffectsDevice ? "On" : "Off",
        accessoryTagColor: config.useSoundEffectsDevice ? "green" : "red",
        drillable: false,
        metadata: [
          {
            kind: "label",
            title: "Sound Effects Device",
            text: config.useSoundEffectsDevice ? "On" : "Off",
            textColor: config.useSoundEffectsDevice ? "green" : "secondary",
          },
        ],
        actions: [
          {
            kind: "toggleUseSoundEffectsDevice",
            title: config.useSoundEffectsDevice
              ? "Disable Sound Effects Device"
              : "Enable Sound Effects Device",
            nextEnabled: !config.useSoundEffectsDevice,
          },
        ],
      },
    ],
    metadata: [
      {
        kind: "label",
        title: "Headphones Only",
        text: config.headphonesOnly ? "On" : "Off",
        textColor: config.headphonesOnly ? "green" : "secondary",
      },
      {
        kind: "label",
        title: "Sound Effects Device",
        text: config.useSoundEffectsDevice ? "On" : "Off",
        textColor: config.useSoundEffectsDevice ? "green" : "secondary",
      },
    ],
    actions: [],
  };
}

function buildBehaviorItem(config: PeonPingConfig): DashboardItem {
  const enabledCount = [
    config.meetingDetect,
    config.suppressSubagentComplete,
  ].filter(Boolean).length;

  return {
    id: "behavior",
    title: "Behavior",
    icon: "clock",
    accessoryText: `${enabledCount}/2 enabled`,
    drillable: true,
    subItems: [
      {
        id: "behavior-meeting-detect",
        title: "Meeting Detect",
        icon: "clock",
        accessoryText: config.meetingDetect ? "On" : "Off",
        accessoryTagColor: config.meetingDetect ? "green" : "red",
        drillable: false,
        metadata: [
          {
            kind: "label",
            title: "Meeting Detect",
            text: config.meetingDetect ? "On" : "Off",
            textColor: config.meetingDetect ? "green" : "secondary",
          },
        ],
        actions: [
          {
            kind: "toggleMeetingDetect",
            title: config.meetingDetect
              ? "Disable Meeting Detect"
              : "Enable Meeting Detect",
            nextEnabled: !config.meetingDetect,
          },
        ],
      },
      {
        id: "behavior-subagent-complete",
        title: "Subagent Complete",
        icon: "clock",
        accessoryText: config.suppressSubagentComplete ? "On" : "Off",
        accessoryTagColor: config.suppressSubagentComplete ? "green" : "red",
        drillable: false,
        metadata: [
          {
            kind: "label",
            title: "Suppress Subagent Complete",
            text: config.suppressSubagentComplete ? "On" : "Off",
            textColor: config.suppressSubagentComplete ? "green" : "secondary",
          },
        ],
        actions: [
          {
            kind: "toggleSuppressSubagentComplete",
            title: config.suppressSubagentComplete
              ? "Enable Subagent Complete Sounds"
              : "Suppress Subagent Complete Sounds",
            nextEnabled: !config.suppressSubagentComplete,
          },
        ],
      },
      {
        id: "behavior-silent-window",
        title: "Silent Window",
        icon: "clock",
        accessoryText: `${config.silentWindowSeconds}s`,
        drillable: true,
        metadata: [
          {
            kind: "label",
            title: "Silent Window",
            text: `${config.silentWindowSeconds}s`,
          },
        ],
        actions: SILENT_WINDOW_OPTIONS.map((seconds) => ({
          kind: "setSilentWindowSeconds" as const,
          title: `Set Silent Window to ${formatSecondsOption(seconds)}`,
          subListTitle: formatSecondsOption(seconds),
          isCurrent: config.silentWindowSeconds === seconds,
          seconds,
        })),
      },
      {
        id: "behavior-session-start-cooldown",
        title: "Session Start Cooldown",
        icon: "clock",
        accessoryText: `${config.sessionStartCooldownSeconds}s`,
        drillable: true,
        metadata: [
          {
            kind: "label",
            title: "Session Start Cooldown",
            text: `${config.sessionStartCooldownSeconds}s`,
          },
        ],
        actions: SESSION_START_COOLDOWN_OPTIONS.map((seconds) => ({
          kind: "setSessionStartCooldownSeconds" as const,
          title: `Set Session Start Cooldown to ${formatSecondsOption(seconds)}`,
          subListTitle: formatSecondsOption(seconds),
          isCurrent: config.sessionStartCooldownSeconds === seconds,
          seconds,
        })),
      },
    ],
    metadata: [
      {
        kind: "label",
        title: "Meeting Detect",
        text: config.meetingDetect ? "On" : "Off",
        textColor: config.meetingDetect ? "green" : "secondary",
      },
      {
        kind: "label",
        title: "Suppress Subagent Complete",
        text: config.suppressSubagentComplete ? "On" : "Off",
        textColor: config.suppressSubagentComplete ? "green" : "secondary",
      },
      {
        kind: "label",
        title: "Silent Window",
        text: `${config.silentWindowSeconds}s`,
      },
      {
        kind: "label",
        title: "Session Start Cooldown",
        text: `${config.sessionStartCooldownSeconds}s`,
      },
    ],
    actions: [],
  };
}

function buildDebugItem(config: PeonPingConfig): DashboardItem {
  return {
    id: "debug",
    title: "Debug Logging",
    icon: "bell",
    accessoryText: config.debugEnabled ? "On" : "Off",
    accessoryTagColor: config.debugEnabled ? "green" : "red",
    drillable: false,
    metadata: [
      {
        kind: "label",
        title: "Debug Logging",
        text: config.debugEnabled ? "On" : "Off",
        textColor: config.debugEnabled ? "green" : "secondary",
      },
      {
        kind: "label",
        title: "Retention",
        text: `${config.debugRetentionDays} days`,
      },
    ],
    actions: [
      {
        kind: "toggleDebugEnabled",
        title: config.debugEnabled
          ? "Disable Debug Logging"
          : "Enable Debug Logging",
        nextEnabled: !config.debugEnabled,
      },
    ],
  };
}

function formatTrainerGoals(exercises: Record<string, number>): string {
  return Object.entries(exercises)
    .map(([name, goal]) => `${name}: ${goal}`)
    .join(", ");
}

function buildTrainerItem(config: PeonPingConfig): DashboardItem {
  const goalSubItems: DashboardItem[] = Object.entries(
    config.trainer.exercises,
  ).map(([exercise, goal]) => ({
    id: `trainer-goal-${exercise}`,
    title: exercise,
    icon: "bulletPoints",
    accessoryText: formatGoalOption(goal),
    drillable: true,
    metadata: [
      {
        kind: "label",
        title: "Exercise",
        text: exercise,
      },
      {
        kind: "label",
        title: "Goal",
        text: formatGoalOption(goal),
      },
    ],
    actions: trainerGoalOptions(goal).map((candidateGoal) => ({
      kind: "setTrainerExerciseGoal" as const,
      title: `Set ${exercise} Goal to ${formatGoalOption(candidateGoal)}`,
      subListTitle: formatGoalOption(candidateGoal),
      isCurrent: goal === candidateGoal,
      exercise,
      goal: candidateGoal,
    })),
  }));

  return {
    id: "trainer",
    title: "Trainer",
    icon: "headphones",
    accessoryText: config.trainer.enabled ? "On" : "Off",
    accessoryTagColor: config.trainer.enabled ? "green" : "red",
    drillable: true,
    subItems: [
      {
        id: "trainer-enabled",
        title: "Trainer",
        icon: "headphones",
        accessoryText: config.trainer.enabled ? "On" : "Off",
        accessoryTagColor: config.trainer.enabled ? "green" : "red",
        drillable: false,
        metadata: [
          {
            kind: "label",
            title: "Trainer",
            text: config.trainer.enabled ? "On" : "Off",
            textColor: config.trainer.enabled ? "green" : "secondary",
          },
        ],
        actions: [
          {
            kind: "toggleTrainerEnabled",
            title: config.trainer.enabled
              ? "Disable Trainer"
              : "Enable Trainer",
            nextEnabled: !config.trainer.enabled,
          },
        ],
      },
      {
        id: "trainer-goals",
        title: "Goals",
        icon: "bulletPoints",
        accessoryText: formatTrainerGoals(config.trainer.exercises),
        drillable: true,
        subItems: goalSubItems,
        metadata: [
          {
            kind: "label",
            title: "Goals",
            text: formatTrainerGoals(config.trainer.exercises),
          },
        ],
        actions: [],
      },
      {
        id: "trainer-reminder-interval",
        title: "Reminder Interval",
        icon: "clock",
        accessoryText: `${config.trainer.reminderIntervalMinutes} min`,
        drillable: true,
        metadata: [
          {
            kind: "label",
            title: "Reminder Interval",
            text: `${config.trainer.reminderIntervalMinutes} min`,
          },
        ],
        actions: TRAINER_REMINDER_INTERVAL_OPTIONS.map((minutes) => ({
          kind: "setTrainerReminderIntervalMinutes" as const,
          title: `Set Reminder Interval to ${formatMinutesOption(minutes)}`,
          subListTitle: formatMinutesOption(minutes),
          isCurrent: config.trainer.reminderIntervalMinutes === minutes,
          minutes,
        })),
      },
      {
        id: "trainer-min-gap",
        title: "Minimum Gap",
        icon: "clock",
        accessoryText: `${config.trainer.reminderMinGapMinutes} min`,
        drillable: true,
        metadata: [
          {
            kind: "label",
            title: "Minimum Gap",
            text: `${config.trainer.reminderMinGapMinutes} min`,
          },
        ],
        actions: TRAINER_REMINDER_MIN_GAP_OPTIONS.map((minutes) => ({
          kind: "setTrainerReminderMinGapMinutes" as const,
          title: `Set Minimum Gap to ${formatMinutesOption(minutes)}`,
          subListTitle: formatMinutesOption(minutes),
          isCurrent: config.trainer.reminderMinGapMinutes === minutes,
          minutes,
        })),
      },
    ],
    metadata: [
      {
        kind: "label",
        title: "Trainer",
        text: config.trainer.enabled ? "On" : "Off",
        textColor: config.trainer.enabled ? "green" : "secondary",
      },
      {
        kind: "label",
        title: "Goals",
        text: formatTrainerGoals(config.trainer.exercises),
      },
      {
        kind: "label",
        title: "Reminder Interval",
        text: `${config.trainer.reminderIntervalMinutes} min`,
      },
      {
        kind: "label",
        title: "Minimum Gap",
        text: `${config.trainer.reminderMinGapMinutes} min`,
      },
    ],
    actions: [],
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
    buildRotationPacksItem(config, packs),
    buildPathRulesItem(config, packs),
    buildCategoriesItem(config),
    buildNotificationsItem(config),
    buildBehaviorItem(config),
    buildAudioItem(config),
    buildDebugItem(config),
    buildTrainerItem(config),
  ];
}
