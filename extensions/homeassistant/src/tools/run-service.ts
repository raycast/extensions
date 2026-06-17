import { ha } from "@lib/common";
import getEntity from "./get-entities";

type Input = {
  /** The service to call (e.g., 'turn_on', 'turn_off', 'start', 'stop', 'toggle').
   * Do not include the domain prefix.
   */
  service: string;
  /**
   * Additional data to pass to the service.
   * IMPORTANT: All entities must require the SAME operation.
   * Do NOT mix entities that need different operations (e.g., don't mix 'turn_on' and 'turn_off' entities).
   * Make separate calls to run-service for different operations.
   */
  data: {
    /**
     * The entity IDs to control with this service operation.
     * All entities must require the SAME operation (e.g., all need to be turned on, or all need to be turned off).
     * For different operations, make separate calls.
     */
    entity_id: string[];
  };
};

/**
 * Run a Home Assistant service.
 * IMPORTANT: Each call should only contain entities that need the SAME operation.
 * For different operations (e.g., turn_on and turn_off), make separate calls to this tool.
 *
 * @param {Input} input The input object containing the service operation
 * @returns {Promise<object>} An empty object if successful, throws an error otherwise
 * @example
 * // Turn on multiple air conditioners
 * {
 *   service: "turn_on",
 *   data: { entity_id: ["climate.ac1", "climate.ac2"] }
 * }
 *
 * // In a separate call, turn off lights
 * {
 *   service: "turn_off",
 *   data: { entity_id: ["light.living_room", "light.bedroom"] }
 * }
 */
export default async function tool(input: Input): Promise<object> {
  try {
    const { service, data } = input;

    if (service.length === 0) {
      throw new Error("Service is required (e.g., 'turn_on', 'turn_off', 'toggle')");
    }

    if (!data?.entity_id?.length) {
      throw new Error("entity_id must be provided as a non-empty array");
    }

    // Fetch available entities for validation
    const { entities } = await getEntity();

    // Group entities by domain
    const entitiesByDomain = new Map<string, string[]>();
    for (const entityId of data.entity_id) {
      const dotIndex = entityId.indexOf(".");
      if (dotIndex === -1) {
        throw new Error(`Invalid entity_id format: ${entityId}. Expected format: domain.entity_name`);
      }
      const domain = entityId.substring(0, dotIndex);
      const entities = entitiesByDomain.get(domain) || [];
      entities.push(entityId);
      entitiesByDomain.set(domain, entities);
    }

    // Validate that all provided entity IDs exist
    for (const entityId of data.entity_id) {
      const entityExists = entities.some((entity) => entity.entity_id === entityId);
      if (!entityExists) {
        const domain = entityId.split(".")[0];
        const availableIds = entities
          .filter((e) => e.entity_id.startsWith(domain + "."))
          .map((e) => `${e.entity_id} (${e.friendly_name})`)
          .join(", ");
        throw new Error(`Invalid entity_id: ${entityId}. Available entities for domain '${domain}': ${availableIds}`);
      }
    }

    // Make service calls for each domain
    await Promise.all(
      Array.from(entitiesByDomain.entries()).map(async ([domain, domainEntities]) => {
        const serviceData = { ...data, entity_id: domainEntities };
        await ha.callService(domain, service, serviceData);
      }),
    );

    return {};
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to call service: ${error.message}`);
    }
    throw new Error("Failed to call service: Unknown error occurred");
  }
}
