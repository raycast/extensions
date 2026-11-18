/**
 * Shared types for Passbolt resources
 */

export interface Resource {
  id: string;
  name?: string | null;
  username: string;
  uri: string;
  uris?: string[];
  description: string;
  metadata_error?: string;
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

// v5 responses omit the descriptive fields until their metadata has been decrypted.
export interface ApiResource extends Omit<Resource, "username" | "uri" | "description"> {
  username?: string | null;
  uri?: string | null;
  description?: string | null;
  metadata?: string | null;
  metadata_key_type?: "user_key" | "shared_key";
  metadata_key_id?: string | null;
  secrets?: Secret[];
  secret?: Secret;
}

export interface ResourceType {
  id: string;
  slug: string;
  name: string;
  definition?: unknown;
}

export interface TotpConfiguration {
  secretKey: string;
  algorithm: string;
  digits: number;
  period: number;
  issuer?: string;
  label?: string;
}

export interface TotpResource extends Resource {
  totp?: TotpConfiguration;
  totp_error?: string;
}

export interface TotpLoadProgress {
  items: TotpResource[];
  processed: number;
  candidates: number;
  totalResources: number;
}

// Progressive metadata decryption updates, shared by Search and Authenticator load paths.
export interface ResourceLoadProgress {
  items: Resource[];
  processed: number;
  candidates: number;
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
