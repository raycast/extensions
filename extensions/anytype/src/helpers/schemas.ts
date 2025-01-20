export interface Pagination {
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface DisplayCodeResponse {
  challenge_id: string;
}

export interface TokenResponse {
  session_token: string;
  app_key: string;
}

export interface Space {
  type: string;
  id: string;
  name: string;
  icon: string;
  home_object_id: string;
  archive_object_id: string;
  profile_object_id: string;
  marketplace_workspace_id: string;
  device_id: string;
  account_space_id: string;
  widgets_id: string;
  space_view_id: string;
  tech_space_id: string;
  timezone: string;
  network_id: string;
  members: Member[];
}

export interface Member {
  type: string;
  id: string;
  name: string;
  icon: string;
  identity: string;
  global_name: string;
  role: string;
}

export interface ObjectExport {
  path: string;
}

export interface Export {
  markdown: string;
}

export interface SpaceObject {
  type: string;
  id: string;
  name: string;
  icon: string;
  layout: string;
  object_type: string;
  space_id: string;
  root_id: string;
  blocks: Block[] | undefined;
  details: Detail[];
}

export interface Block {
  id: string;
  children_ids: string[];
  background_color: string;
  align: string;
  vertical_align: string;
  text: Text;
  file: File;
}

export interface Text {
  text: string;
  style: string;
  checked: boolean;
  color: string;
  icon: string;
}

export interface File {
  hash: string;
  name: string;
  type: string;
  mime: string;
  size: number;
  added_at: number;
  target_object_id: string;
  state: string;
  style: string;
}

export interface Detail {
  id: string;
  details: {
    created_date: string; // ISO 8601 date
    last_modified_date: string; // ISO 8601 date
    details: Member; // Details of a participant
    tags: Tag[]; // List of tags
    [key: string]: unknown; // Additional details
  };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Type {
  type: string;
  id: string;
  unique_key: string;
  name: string;
  icon: string;
  recommended_layout: string;
}

export interface Template {
  type: string;
  id: string;
  name: string;
  icon: string;
}
