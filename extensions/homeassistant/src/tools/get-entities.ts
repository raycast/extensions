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

/**
 * Get all entities from Home Assistant.
 * @returns {Promise<{ entities: Entity[] }>}
 */
export default async function (): Promise<{ entities: Entity[] }> {
  try {
    // Get states from REST API
    const statesResponse = await ha.fetch("states");

    // Validate response
    if (!Array.isArray(statesResponse)) {
      throw new Error("Invalid response from Home Assistant: expected array of states");
    }

    // Map states to entities
    const entities = statesResponse.map((state: EntityState) => ({
      entity_id: state.entity_id,
      friendly_name: state.attributes.friendly_name || state.entity_id,
      state: state.state,
      attributes: state.attributes,
    }));

    return { entities };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get entities: ${error.message}`);
    }
    throw new Error("Failed to get entities: Unknown error occurred");
  }
}
