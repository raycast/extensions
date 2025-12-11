/**
 * Shared types for Passbolt resources
 */

export interface Resource {
  id: string;
  name: string;
  username: string;
  uri: string;
  description: string;
  modified: string;
  created: string;
  deleted: boolean;
  favorite?: boolean;
  folder_parent_id?: string | null;
  personal?: boolean;
  resource_type_id?: string;
  tags?: Tag[];
  permission?: Permission;
}

export interface Tag {
  id: string;
  slug: string;
  is_shared: boolean;
}

export interface Permission {
  id: string;
  aco: string;
  aco_foreign_key: string;
  aro: string;
  aro_foreign_key: string;
  type: number;
}

export interface Folder {
  id: string;
  name: string;
  created: string;
  modified: string;
  created_by: string;
  modified_by: string;
  personal: boolean;
  folder_parent_id: string | null;
}

export interface Secret {
  id: string;
  user_id: string;
  resource_id: string;
  data: string;
  created: string;
  modified: string;
}
