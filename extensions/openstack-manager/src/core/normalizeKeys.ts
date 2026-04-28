/**
 * Normalizes JSON object keys from the openstack CLI output.
 *
 * The `openstack` CLI `-f json` output uses different key formats depending
 * on the command:
 * - `list` commands use capitalized column headers: "ID", "Name", "Status", "Networks"
 * - `show` commands use lowercase with underscores: "id", "name", "status"
 *
 * This utility normalizes all keys to lowercase_with_underscores to match
 * our TypeScript interfaces.
 */

/**
 * Known CLI column name mappings that don't follow simple rules.
 * Maps the normalized (lowercased, space→underscore) form to our interface field name.
 */
const KEY_ALIASES: Record<string, string> = {
  // Server list columns
  networks: "networks",
  flavor: "flavor",
  image: "image",

  // Flavor list columns
  vcpus: "vcpus",
  ram: "ram",
  disk: "disk",
  is_public: "is_public",

  // Image list columns
  disk_format: "disk_format",
  container_format: "container_format",
  min_disk: "min_disk",
  min_ram: "min_ram",

  // Network list columns
  admin_state_up: "admin_state_up",
  "router:external": "router_external",
  "provider:network_type": "provider_network_type",
  "provider:segmentation_id": "provider_segmentation_id",

  // Security group
  project: "project_id",
  rules: "security_group_rules",
};

/**
 * Converts a single key to normalized form:
 * "Name" → "name", "Admin State Up" → "admin_state_up",
 * "Is Public" → "is_public", "ID" → "id"
 */
function normalizeKey(key: string): string {
  // First: replace spaces with underscores and lowercase everything
  const normalized = key.replace(/\s+/g, "_").toLowerCase();

  // Check if there's a known alias
  if (KEY_ALIASES[normalized]) {
    return KEY_ALIASES[normalized];
  }

  return normalized;
}

/**
 * Recursively normalizes all keys in a JSON value returned by the CLI.
 * - Objects get their keys normalized
 * - Arrays have each element normalized
 * - Primitives pass through unchanged
 */
export function normalizeKeys<T>(data: unknown): T {
  if (Array.isArray(data)) {
    return data.map((item) => normalizeKeys(item)) as unknown as T;
  }

  if (data !== null && typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[normalizeKey(key)] = normalizeKeys(value);
    }
    return result as T;
  }

  return data as T;
}
