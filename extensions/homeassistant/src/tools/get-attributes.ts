import { ha } from "@lib/common";

type EntityState = {
  entity_id: string;
  attributes: {
    friendly_name?: string;
    [key: string]: unknown;
  };
  state: string;
};

type Entity = {
  entity_id: string;
  friendly_name: string;
  state: string;
  attributes: Record<string, unknown>;
};

type Input = {
  /**
   * The entity IDs to fetch attributes for.
   */
  entity_ids: string[];
};

/**
 * Get full state and attributes for specific entities from Home Assistant.
 * IMPORTANT: Collect ALL needed entity IDs and request them in a SINGLE call.
 * @param {Input} input The arguments containing the entity IDs.
 * @param {string[]} input.entity_ids An array of entity IDs to fetch attributes for.
 * @returns {Promise<{ entities: Entity[] }>}
 */
export default async function tool(input: Input): Promise<{ entities: Entity[] }> {
  const { entity_ids } = input;

  if (!Array.isArray(entity_ids) || entity_ids.length === 0) {
    throw new Error("Missing or invalid 'entity_ids' argument. It must be a non-empty array of strings.");
  }

  try {
    // Get all states from REST API
    const statesResponse = await ha.fetch("states");

    // Validate response
    if (!Array.isArray(statesResponse)) {
      throw new Error("Invalid response from Home Assistant: expected array of states");
    }

    // Filter states based on the provided entity_ids and map to the Entity structure
    const entities = statesResponse
      .filter((state: EntityState) => entity_ids.includes(state.entity_id))
      .map((state: EntityState) => ({
        entity_id: state.entity_id,
        friendly_name: state.attributes.friendly_name || state.entity_id,
        state: state.state,
        attributes: state.attributes,
      }));

    // Check if all requested entities were found (optional, but good practice)
    const foundIds = entities.map((e) => e.entity_id);
    const notFoundIds = entity_ids.filter((id) => !foundIds.includes(id));
    if (notFoundIds.length > 0) {
      console.warn(`Could not find attributes for the following entities: ${notFoundIds.join(", ")}`);
      // Depending on requirements, you might want to throw an error here
      // or just return the ones that were found. Currently, it returns only found entities.
    }

    return { entities };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get entity attributes: ${error.message}`);
    }
    throw new Error("Failed to get entity attributes: Unknown error occurred");
  }
}
