import { LocalStorage } from "@raycast/api";
import {
  ActionOrGroup,
  RootConfig,
  ConfigData,
  isGroup,
  Action,
  Group,
  LegacyMappingsData,
  ActionType,
} from "./types";

const STORAGE_KEY = "leader-key-config";
const LEGACY_STORAGE_KEY = "key-mappings";
const CURRENT_VERSION = 1;

const DEFAULT_CONFIG: RootConfig = {
  type: "group",
  actions: [
    {
      id: "default-c",
      key: "c",
      type: "application",
      label: "Calculator",
      value: "/System/Applications/Calculator.app",
    },
    {
      id: "default-a",
      key: "a",
      type: "group",
      label: "Applications",
      actions: [
        {
          id: "default-af",
          key: "f",
          type: "application",
          label: "Finder",
          value: "/System/Library/CoreServices/Finder.app",
        },
        {
          id: "default-at",
          key: "t",
          type: "application",
          label: "Terminal",
          value: "/System/Applications/Utilities/Terminal.app",
        },
      ],
    },
  ],
};

export async function getConfig(): Promise<RootConfig> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (!stored) {
    const migrated = await migrateFromLegacy();
    if (migrated) {
      return migrated;
    }
    await saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const data: ConfigData = JSON.parse(stored);
    return data.root;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: RootConfig): Promise<void> {
  const data: ConfigData = {
    root: config,
    version: CURRENT_VERSION,
  };
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function addItemToGroup(
  config: RootConfig,
  parentPath: string[],
  item: ActionOrGroup,
): Promise<RootConfig> {
  const newConfig = structuredClone(config);
  const parent = findGroupByPath(newConfig, parentPath);
  if (parent) {
    parent.actions.push(item);
  }
  return newConfig;
}

export async function updateItem(
  config: RootConfig,
  path: string[],
  updates: Partial<Action> | Partial<Group>,
): Promise<RootConfig> {
  const newConfig = structuredClone(config);
  const parentPath = path.slice(0, -1);
  const itemId = path[path.length - 1];
  const parent =
    parentPath.length === 0
      ? newConfig
      : findGroupByPath(newConfig, parentPath);

  if (parent) {
    const index = parent.actions.findIndex((a) => a.id === itemId);
    if (index !== -1) {
      parent.actions[index] = {
        ...parent.actions[index],
        ...updates,
      } as ActionOrGroup;
    }
  }
  return newConfig;
}

export async function deleteItem(
  config: RootConfig,
  path: string[],
): Promise<RootConfig> {
  const newConfig = structuredClone(config);
  const parentPath = path.slice(0, -1);
  const itemId = path[path.length - 1];
  const parent =
    parentPath.length === 0
      ? newConfig
      : findGroupByPath(newConfig, parentPath);

  if (parent) {
    parent.actions = parent.actions.filter((a) => a.id !== itemId);
  }
  return newConfig;
}

export function findGroupByPath(
  config: RootConfig | Group,
  path: string[],
): Group | null {
  if (path.length === 0) {
    return config as Group;
  }

  const [currentId, ...rest] = path;
  const child = config.actions.find((a) => a.id === currentId);

  if (!child || !isGroup(child)) {
    return null;
  }

  if (rest.length === 0) {
    return child;
  }

  return findGroupByPath(child, rest);
}

export function findItemByPath(
  config: RootConfig,
  path: string[],
): ActionOrGroup | null {
  if (path.length === 0) {
    return null;
  }

  const parentPath = path.slice(0, -1);
  const itemId = path[path.length - 1];
  const parent =
    parentPath.length === 0 ? config : findGroupByPath(config, parentPath);

  if (!parent) {
    return null;
  }

  return parent.actions.find((a) => a.id === itemId) || null;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function checkKeyConflict(
  group: Group | RootConfig,
  newKey: string,
  excludeId?: string,
): { hasConflict: boolean; conflictLabel: string } {
  for (const item of group.actions) {
    if (excludeId && item.id === excludeId) continue;
    if (item.key === newKey) {
      return {
        hasConflict: true,
        conflictLabel:
          item.label || (item.type === "group" ? "a group" : item.value),
      };
    }
  }
  return { hasConflict: false, conflictLabel: "" };
}

async function migrateFromLegacy(): Promise<RootConfig | null> {
  const stored = await LocalStorage.getItem<string>(LEGACY_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const data: LegacyMappingsData = JSON.parse(stored);
    const mappings = data.mappings;

    if (!mappings || mappings.length === 0) {
      return null;
    }

    const root: RootConfig = { type: "group", actions: [] };
    const groupMap = new Map<string, Group>();

    const groups = mappings.filter((m) => m.isGroup && !m.action);
    for (const g of groups) {
      const group: Group = {
        id: g.id,
        key: g.sequence,
        type: "group",
        label: g.groupName || g.label,
        actions: [],
      };
      groupMap.set(g.sequence, group);
    }

    for (const m of mappings) {
      if (m.isGroup && !m.action) continue;
      if (!m.action) continue;

      const action: Action = {
        id: m.id,
        key: m.sequence.length > 1 ? m.sequence.slice(-1) : m.sequence,
        type: convertLegacyType(m.action.type),
        label: m.label,
        value: m.action.target,
      };

      if (m.sequence.length > 1) {
        const prefix = m.sequence.slice(0, -1);
        const parentGroup = groupMap.get(prefix);
        if (parentGroup) {
          parentGroup.actions.push(action);
        } else {
          let group = groupMap.get(prefix);
          if (!group) {
            group = {
              id: generateId(),
              key: prefix,
              type: "group",
              label: prefix.toUpperCase(),
              actions: [],
            };
            groupMap.set(prefix, group);
          }
          group.actions.push(action);
        }
      } else {
        root.actions.push(action);
      }
    }

    for (const group of groupMap.values()) {
      if (group.key.length === 1) {
        root.actions.push(group);
      }
    }

    await saveConfig(root);
    return root;
  } catch {
    return null;
  }
}

function convertLegacyType(legacyType: string): ActionType {
  switch (legacyType) {
    case "app":
      return "application";
    case "url":
    case "raycast":
      return "url";
    case "file":
      return "folder";
    case "shell":
      return "command";
    default:
      return "application";
  }
}

export interface LeaderKeyAction {
  key: string;
  type: "application" | "url" | "folder" | "command";
  value: string;
  label?: string;
}

export interface LeaderKeyGroup {
  key: string;
  type: "group";
  label?: string;
  actions: LeaderKeyItem[];
}

export type LeaderKeyItem = LeaderKeyAction | LeaderKeyGroup;

export interface LeaderKeyConfig {
  type: "group";
  actions: LeaderKeyItem[];
}

export function importLeaderKeyConfig(external: LeaderKeyConfig): RootConfig {
  function convertItem(
    item: LeaderKeyItem,
    prefix: string = "",
  ): ActionOrGroup {
    const id = generateId();

    if (item.type === "group") {
      const group = item as LeaderKeyGroup;
      return {
        id,
        key: group.key,
        type: "group",
        label: group.label,
        actions: group.actions.map((child) =>
          convertItem(child, prefix + group.key),
        ),
      } as Group;
    } else {
      const action = item as LeaderKeyAction;
      return {
        id,
        key: action.key,
        type: action.type,
        label: action.label,
        value: action.value,
      } as Action;
    }
  }

  return {
    type: "group",
    actions: external.actions.map((item) => convertItem(item)),
  };
}

export function exportLeaderKeyConfig(config: RootConfig): LeaderKeyConfig {
  function convertItem(item: ActionOrGroup): LeaderKeyItem {
    if (isGroup(item)) {
      const result: LeaderKeyGroup = {
        key: item.key,
        type: "group",
        actions: item.actions.map(convertItem),
      };
      if (item.label) {
        result.label = item.label;
      }
      return result;
    } else {
      const action = item as Action;
      const result: LeaderKeyAction = {
        key: action.key,
        type: action.type,
        value: action.value,
      };
      if (action.label) {
        result.label = action.label;
      }
      return result;
    }
  }

  return {
    type: "group",
    actions: config.actions.map(convertItem),
  };
}

export async function importConfigFromJson(
  jsonString: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== "object") {
      return { success: false, error: "Invalid JSON: not an object" };
    }
    if (parsed.type !== "group") {
      return {
        success: false,
        error: "Invalid config: root must have type 'group'",
      };
    }
    if (!Array.isArray(parsed.actions)) {
      return {
        success: false,
        error: "Invalid config: missing 'actions' array",
      };
    }

    const config = importLeaderKeyConfig(parsed as LeaderKeyConfig);
    await saveConfig(config);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: `Parse error: ${message}` };
  }
}

export async function exportConfigToJson(): Promise<string> {
  const config = await getConfig();
  const external = exportLeaderKeyConfig(config);
  return JSON.stringify(external, null, 2);
}
