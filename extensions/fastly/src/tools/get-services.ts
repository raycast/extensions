import { getServices } from "../api";

/**
 * List all Fastly services on the account. Returns each service's id, name,
 * type ("vcl" for CDN services, "wasm" for Compute services), and timestamps.
 * Use this first to resolve a service name mentioned by the user to a service ID.
 */
export default async function () {
  const services = await getServices();
  return services.map((service) => ({
    id: service.id,
    name: service.name,
    type: service.type === "wasm" ? "compute" : "cdn",
    created_at: service.created_at,
    updated_at: service.updated_at,
  }));
}
