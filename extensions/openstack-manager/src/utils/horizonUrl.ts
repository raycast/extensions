/**
 * Horizon deep-link builder.
 *
 * Constructs URLs that open a specific resource in the OpenStack Horizon
 * dashboard. Uses the modern Horizon URL pattern:
 *   {base}/{service}/{resource}/detail/{id}
 */

/** Resource types supported by the Horizon deep-link builder. */
export type HorizonResourceType = "servers" | "networks" | "security_groups" | "clusters";

/**
 * Maps a resource type to its Horizon URL path.
 * Pattern: {base}/{path}/{id}
 */
const RESOURCE_PATH_MAP: Record<HorizonResourceType, string> = {
  servers: "compute/instance/detail",
  networks: "network/networks/detail",
  security_groups: "network/security-group/detail",
  clusters: "container-infra/clusters/detail",
};

/**
 * Builds a Horizon deep-link for the given resource.
 *
 * @param horizonUrl - Base Horizon URL (e.g. `https://cloud.example.com`).
 *   Returns `null` if undefined or empty.
 * @param resourceType - The type of OpenStack resource.
 * @param id - The resource UUID.
 * @returns The full Horizon URL, or `null` if `horizonUrl` is not provided.
 */
export function buildHorizonLink(
  horizonUrl: string | undefined,
  resourceType: HorizonResourceType,
  id: string,
): string | null {
  if (!horizonUrl || horizonUrl.trim() === "") {
    return null;
  }

  const base = horizonUrl.replace(/\/+$/, "");
  const path = RESOURCE_PATH_MAP[resourceType];

  return `${base}/${path}/${id}`;
}
