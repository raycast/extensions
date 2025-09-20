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

export type WorkspaceConfig = {
  id?: string;
  remoteURL: string;
  workspaceName: string;
  workspaceId: string;
  workspaceToken: string;
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
export type Kind = "flow" | "app" | "script" | "raw_app";
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

export type WindmillListItem = {
  workspace_id: string;
  path: string;
  summary: string;
  description: string;
  edited_by: string;
  edited_at: string;
  archived: boolean;
  extra_perms: object;
  starred: boolean;
  has_draft: boolean;
  draft_only: boolean;
};

export type WindmillListItemExtended = Omit<WindmillListItem, "edited_at"> & {
  edited_at: Date | null | undefined;
  edited_at_locale?: string | null;
  newest_date?: Date | null | undefined;
  last_exec_time?: Date | null | undefined;
  kind: string;
};

export type WindmillWorkspacePairArray = [WindmillListItem, WorkspaceConfig];

export type ExtendedWindmillWorkspacePair = [WindmillListItemExtended, WorkspaceConfig];
