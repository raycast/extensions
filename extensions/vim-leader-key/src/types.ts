export type ActionType = "application" | "url" | "command" | "folder";

export interface Action {
  id: string;
  key: string;
  type: ActionType;
  label?: string;
  value: string;
  browser?: string;
}

export interface Group {
  id: string;
  key: string;
  type: "group";
  label?: string;
  actions: ActionOrGroup[];
  browser?: string;
}

export type ActionOrGroup = Action | Group;

export function isGroup(item: ActionOrGroup): item is Group {
  return item.type === "group";
}

export function isAction(item: ActionOrGroup): item is Action {
  return item.type !== "group";
}

export interface RootConfig {
  type: "group";
  actions: ActionOrGroup[];
}

export interface ConfigData {
  root: RootConfig;
  version: number;
}

export type LegacyActionType = "app" | "url" | "file" | "shell" | "raycast";

export interface LegacyKeyMapping {
  id: string;
  sequence: string;
  label: string;
  description?: string;
  isGroup?: boolean;
  groupName?: string;
  action?: {
    type: LegacyActionType;
    target: string;
  };
}

export interface LegacyMappingsData {
  mappings: LegacyKeyMapping[];
}
