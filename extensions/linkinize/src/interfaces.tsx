export interface LoginPayload {
  email: string;
  password: string;
}

export interface Bookmark {
  name: string;
  description?: string;
  url: string;
  id: string;
  favicon: string;
  weight: number;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Permissions {
  can_edit: boolean;
  can_view: boolean;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
}

export interface Interaction {
  id: string;
  at: number;
  oid: string;
  wid: string;
}

export interface SyncResponse {
  active: {
    organization_id: string;
    name: string;
    bookmarks: Bookmark[];
    permission: Permissions;
    tags: Tag[];
    workspaces: Workspace[];
    workspace_id: string;
  };
  meta: {
    organizations: Organization[];
    minimum_version: string;
    maintenance?: {
      starts_at: string;
      ends_at: string;
      message: string;
    };
    user: UserInfo;
  };
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  sync: SyncResponse;
}
