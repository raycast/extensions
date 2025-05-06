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
};

/**
 * Get basic entity information (ID and friendly name) from Home Assistant.
 * IMPORTANT: This tool should be called ONLY ONCE per conversation.
 * Entity list doesn't change during a conversation, so caching the results is recommended.
 * @returns {Promise<{ entities: Entity[] }>} A list of all entities with their IDs and friendly names
 */
export default async function tool(): Promise<{ entities: Entity[] }> {
  try {
    // Get states from REST API
    const statesResponse = await ha.fetch("states");

    // Validate response
    if (!Array.isArray(statesResponse)) {
      throw new Error("Invalid response from Home Assistant: expected array of states");
    }

    // Map states to basic entity info
    const entities = statesResponse.map((state: EntityState) => ({
      entity_id: state.entity_id,
      friendly_name: state.attributes.friendly_name || state.entity_id,
    }));

    return { entities };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get entities: ${error.message}`);
    }
    throw new Error("Failed to get entities: Unknown error occurred");
  }
}
