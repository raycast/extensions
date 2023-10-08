type PropertyType = "string" | "integer" | "number" | "boolean" | "object" | "array";

export interface Property {
  type: PropertyType;
  description: string;
  default: string | number | boolean | object | string[];
  contentEncoding?: string;
  format?: string;
  enum?: string[];
}

export interface Properties {
  [key: string]: Property;
}

export type EditVariable = {
  path: string;
  value: string;
  is_secret: boolean;
  description: string;
};

export type WorkspaceConfig = {
  id?: string;
  remoteURL: string;
  workspaceName: string;
  workspaceId: string;
  workspaceToken: string;
  disabled?: boolean;
};

export type Resource = {
  workspace_id: string;
  path: string;
  description: string;
  resource_type: string;
  is_oauth: boolean;
  extra_perms: object;
  is_expired: boolean;
  refresh_error: string;
  is_linked: boolean;
  is_refreshed: boolean;
  account: number;
};

export type Kind =
  | "flow"
  | "app"
  | "script"
  | "raw_app"
  | "variable"
  | "resource"
  | "user"
  | "schedule"
  | "group"
  | "folder";

export type WindmillItem = {
  path: string;
  workspace_id: string;
  description: string;
  value: object;
  starred: boolean;
  draft_only: boolean;
  summary: string;
  edited_by: string;
  edited_at: string | null;
  archived: boolean;
  schema: {
    $schema: string;
    properties: Properties;
    required: string[];
    type: PropertyType;
  };
  extra_perms: object;
};

export type BaseWindmillListItem = {
  workspace_id: string;
  edited_by: string;
  edited_at?: string | null;
};

export type WindmillListItemProcessed = Omit<BaseWindmillListItem, "edited_at"> & {
  edited_at?: Date | null | undefined;
  edited_at_locale?: string | null;
  newest_date?: Date | null | undefined;
  last_exec_time?: Date | null | undefined;
  kind: Kind;
};

export type FlowListItem = BaseWindmillListItem & {
  path: string;
  summary: string;
  description: string;
  extra_perms: object;
  archived: boolean;
  starred: boolean;
  has_draft: boolean;
  draft_only: boolean;
};

export type FlowListItemExtended = Omit<FlowListItem, "edited_at"> &
  WindmillListItemProcessed & {
    kind: "flow";
  };

export type AppListItem = BaseWindmillListItem & {
  path: string;
  summary: string;
  description: string;
  extra_perms: object;
  archived: boolean;
  starred: boolean;
  has_draft: boolean;
  draft_only: boolean;
};

export type AppListItemExtended = Omit<AppListItem, "edited_at"> &
  WindmillListItemProcessed & {
    kind: "app";
  };

export type ScriptListItem = BaseWindmillListItem & {
  path: string;
  summary: string;
  description: string;
  extra_perms: object;
  archived: boolean;
  starred: boolean;
  has_draft: boolean;
  draft_only: boolean;
};

export type ScriptListItemExtended = Omit<ScriptListItem, "edited_at"> &
  WindmillListItemProcessed & {
    kind: "script";
  };

type RawAppListItem = BaseWindmillListItem & {
  path: string;
  summary: string;
  description: string;
  extra_perms: ExtraPerms;
  archived: boolean;
  starred: boolean;
  has_draft: boolean;
  draft_only: boolean;
};

export type RawAppListItemExtended = Omit<RawAppListItem, "edited_at"> &
  WindmillListItemProcessed & {
    kind: "raw_app";
  };

export type VariableListItem = BaseWindmillListItem & {
  path: string;
  value: unknown;
  is_secret: boolean;
  description: string;
  extra_perms: ExtraPerms;
  account: string | null;
  is_oauth: boolean;
  is_expired: boolean;
  is_refreshed: boolean;
  refresh_error: string | null;
  is_linked: boolean;
};

export type VariableListItemExtended = Omit<VariableListItem, "edited_at"> &
  WindmillListItemProcessed & {
    kind: "variable";
  };

export type ResourceListItem = BaseWindmillListItem & {
  path: string;
  value: unknown;
  description: string;
  resource_type: string;
  extra_perms: ExtraPerms;
  is_linked: boolean;
  is_refreshed: boolean;
  is_oauth: boolean;
  is_expired: boolean;
  refresh_error: string | null;
  account: string;
};

export type ResourceListItemExtended = Omit<ResourceListItem, "edited_at"> &
  WindmillListItemProcessed & {
    kind: "resource";
  };

type ExtraPerms = {
  [key: string]: boolean;
};

export type FolderListItem = BaseWindmillListItem & {
  name: string;
  display_name: string;
  owners: string[];
  extra_perms: ExtraPerms;
};

export type FolderListItemExtended = Omit<FolderListItem, "edited_at"> &
  WindmillListItemProcessed & {
    kind: "folder";
  };

export type GroupListItem = BaseWindmillListItem & {
  name: string;
  summary: string;
  extra_perms: ExtraPerms;
};

export type GroupListItemExtended = Omit<GroupListItem, "edited_at"> &
  WindmillListItemProcessed & {
    kind: "group";
  };

export type ScheduleListItem = BaseWindmillListItem & {
  path: string;
  summary: string;
  description: string;
  extra_perms: ExtraPerms;
  schedule: string;
  timezone: string;
  enabled: boolean;
  script_path: string;
  is_flow: boolean;
  args: object;
  email: string;
  on_failure: string | null;
};

export type ScheduleListItemExtended = Omit<ScheduleListItem, "edited_at"> &
  WindmillListItemProcessed & {
    kind: "schedule";
  };

type usage = {
  executions: number;
};

export type UserListItem = BaseWindmillListItem & {
  email: string;
  username: string;
  is_admin: boolean;
  created_at: string;
  operator: boolean;
  disabled: boolean;
  role: string | null;
  usage: usage;
};

export type UserListItemExtended = Omit<UserListItem, "edited_at"> &
  WindmillListItemProcessed & {
    kind: "user";
  };

export type WindmillListItem =
  | FlowListItem
  | AppListItem
  | ScriptListItem
  | RawAppListItem
  | VariableListItem
  | ResourceListItem
  | UserListItem
  | FolderListItem
  | GroupListItem
  | ScheduleListItem;

export type WindmillListItemExtended =
  | FlowListItemExtended
  | AppListItemExtended
  | ScriptListItemExtended
  | RawAppListItemExtended
  | VariableListItemExtended
  | ResourceListItemExtended
  | UserListItemExtended
  | FolderListItemExtended
  | GroupListItemExtended
  | ScheduleListItemExtended;

export type WindmillWorkspacePairArray = [WindmillListItem, WorkspaceConfig];

export type ExtendedWindmillWorkspacePair = [WindmillListItemExtended, WorkspaceConfig];
