import { getServiceDetails, getServiceDomains } from "../api";

type Input = {
  /** The service ID. Resolve a service name to its ID with the get-services tool first. */
  serviceId: string;
};

/**
 * Get details for a single Fastly service: name, type, active version,
 * domains served, and the list of versions (with active/locked state).
 */
export default async function ({ serviceId }: Input) {
  const [details, domains] = await Promise.all([getServiceDetails(serviceId), getServiceDomains(serviceId)]);
  return {
    id: details.id,
    name: details.name,
    type: details.type === "wasm" ? "compute" : "cdn",
    active_version: details.active_version,
    domains,
    versions: details.versions.map((version) => ({
      number: version.number,
      active: version.active,
      locked: version.locked,
      updated_at: version.updated_at,
    })),
  };
}
