/**
 * Type definitions for OpenStack cloud configuration management.
 *
 * These interfaces model the standard OpenStack clouds.yaml format
 * with support for application credential authentication.
 */

/**
 * Authentication credentials for a cloud configuration.
 * Uses OpenStack v3 application credentials.
 */
export interface CloudAuthConfig {
  auth_url: string;
  application_credential_id: string;
  application_credential_secret: string;
}

/**
 * A named OpenStack cloud configuration entry.
 * Maps to a single entry under the `clouds` key in clouds.yaml,
 * with the `name` field representing the YAML key.
 */
export interface CloudConfig {
  name: string;
  auth_type: "v3applicationcredential";
  auth: CloudAuthConfig;
  region_name: string;
  interface: "public" | "internal" | "admin";
  identity_api_version: 3;
  horizon_url?: string;
}

/**
 * The top-level structure of a clouds.yaml file.
 * Each key under `clouds` is the config name; the value
 * contains all fields except `name`.
 */
export interface CloudsYamlFile {
  clouds: Record<string, Omit<CloudConfig, "name">>;
}
