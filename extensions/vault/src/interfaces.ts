/* eslint-disable @typescript-eslint/no-explicit-any */

export const VAULT_TOKEN_CACHE_KEY = "vault-token";
export const VAULT_NAMESPACE_CACHE_KEY = "vault-namespace";
export const VAULT_SECRET_ENGINE_CACHE_KEY = "vault-secret-engine";

export enum DisplayMode {
  list = "list",
  json = "json",
}

export enum ExportMode {
  env = "env",
  json = "json",
}

export enum DeleteMode {
  deleteVersion = "deleteVersion",
  destroyVersion = "destroyVersion",
  destroyAllVersions = "destroyAllVersions",
}

export interface VaultTokenCache {
  token: string;
  expiration: number;
}

export interface VaultEntry {
  key: string;
  value: any;
}

export interface VaultListEntry {
  key: string;
  label: string;
  folder: boolean;
  favorite: boolean;
}

export interface VaultAuthUrlResponse {
  data: {
    auth_url: string;
  };
}

export interface VaultLoginResponse {
  auth: VaultLoginAuthResponse;
}

export interface VaultLoginAuthResponse {
  client_token: string;
  lease_duration: number;
}

export interface VaultReadResponse {
  data: any;
  metadata: VaultMetaDataResponse;
}

export interface VaultReadMetadataResponse {
  current_version: VaultVersion;
  versions: VaultVersion[];
}

export interface VaultVersion {
  version: number;
  created_time: string;
  deletion_time: string;
  destroyed: boolean;
  deleted: boolean;
}

export interface VaultMetaDataResponse {
  version: number;
  created_time: string;
}

export interface VaultEntity {
  id: string;
  name: string;
  creation_time: string;
  aliases: VaultAlias[];
  policies: string[];
}

export interface VaultAlias {
  id: string;
  mount_type: string;
  name: string;
}

export interface VaultMount {
  name: string;
  description: string;
  type: string;
  accessor: string;
}
