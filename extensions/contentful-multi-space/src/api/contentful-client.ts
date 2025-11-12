import {
  type ContentfulClientApi,
  createClient as createContentfulClient,
} from "contentful";
import type { SpaceConfig } from "../types/contentful";

/**
 * Parse and validate space configurations from JSON string
 * @param spacesJson - JSON string containing array of space configurations
 * @returns Array of validated SpaceConfig objects
 * @throws Error if JSON is invalid or required fields are missing
 */
export function parseSpaceConfigs(spacesJson: string): SpaceConfig[] {
  if (!spacesJson || spacesJson.trim() === "") {
    throw new Error(
      "Spaces configuration is empty. Please configure at least one space in preferences."
    );
  }

  let configs: unknown;
  try {
    configs = JSON.parse(spacesJson);
  } catch (error) {
    throw new Error(
      `Invalid JSON in spaces configuration: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  if (!Array.isArray(configs)) {
    throw new Error("Spaces configuration must be a JSON array.");
  }

  if (configs.length === 0) {
    throw new Error("At least one space must be configured.");
  }

  return configs.map((config, index) => {
    if (!config || typeof config !== "object") {
      throw new Error(
        `Space configuration at index ${index} is not an object.`
      );
    }

    const spaceConfig = config as Record<string, unknown>;

    if (!spaceConfig.name || typeof spaceConfig.name !== "string") {
      throw new Error(
        `Space configuration at index ${index} is missing required field: name`
      );
    }

    if (!spaceConfig.spaceId || typeof spaceConfig.spaceId !== "string") {
      throw new Error(
        `Space configuration at index ${index} is missing required field: spaceId`
      );
    }

    if (
      !spaceConfig.accessToken ||
      typeof spaceConfig.accessToken !== "string"
    ) {
      throw new Error(
        `Space configuration at index ${index} is missing required field: accessToken`
      );
    }

    return {
      name: spaceConfig.name,
      spaceId: spaceConfig.spaceId,
      accessToken: spaceConfig.accessToken,
      environment:
        typeof spaceConfig.environment === "string"
          ? spaceConfig.environment
          : "master",
    };
  });
}

/**
 * Create a Contentful client for a specific space
 * @param config - Space configuration
 * @returns Initialized Contentful client
 * @internal
 */
function createClient(config: SpaceConfig): ContentfulClientApi<undefined> {
  return createContentfulClient({
    space: config.spaceId,
    accessToken: config.accessToken,
    environment: config.environment || "master",
  });
}

/**
 * Create multiple Contentful clients from space configurations
 * @param configs - Array of space configurations
 * @returns Array of tuples containing [SpaceConfig, ContentfulClientApi]
 */
export function createClients(
  configs: SpaceConfig[]
): [SpaceConfig, ContentfulClientApi<undefined>][] {
  return configs.map((config) => [config, createClient(config)]);
}
