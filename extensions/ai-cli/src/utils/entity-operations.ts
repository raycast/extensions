import { BaseCustomEntity, CustomEntityInput, CustomEntityUpdate } from "../types";

/**
 * Pure utility functions for entity operations without React state dependencies.
 * These functions handle entity transformation and business logic.
 */

/**
 * Creates a unique variant identifier with optional suffix
 */
export const createVariantId = (suffix?: string): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const base = `var-${timestamp}-${random}`;
  return suffix ? `${base}-${suffix}` : base;
};

/**
 * Creates an ISO timestamp for the current time
 */
export const createTimestamp = (): string => new Date().toISOString();

/**
 * Creates a new entity with proper metadata timestamps and ID generation.
 */
export function createEntityWithMetadata<T extends BaseCustomEntity>(
  entityData: CustomEntityInput<T>,
  createEntityId?: () => string
): T {
  const now = createTimestamp();
  return {
    ...entityData,
    id: createEntityId ? createEntityId() : `entity-${Date.now()}`,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
  } as T;
}

/**
 * Updates an entity in a list by ID with new data and updated timestamp.
 */
export function updateEntityInList<T extends BaseCustomEntity>(
  entities: T[],
  id: string,
  updates: CustomEntityUpdate<T>
): T[] {
  return entities.map((entity) =>
    entity.id === id ? { ...entity, ...updates, updatedAt: createTimestamp() } : entity
  );
}

/**
 * Removes an entity from a list by ID.
 */
export function removeEntityFromList<T extends BaseCustomEntity>(entities: T[], id: string): T[] {
  return entities.filter((entity) => entity.id !== id);
}

/**
 * Finds an entity in a list by ID.
 */
export function findEntityById<T extends BaseCustomEntity>(entities: T[], id: string): T | undefined {
  return entities.find((entity) => entity.id === id);
}

/**
 * Merges built-in entities with stored entities, removing duplicates.
 * Built-in entities are only included if they don't already exist in the stored entities.
 */
export function mergeWithBuiltInEntities<T extends BaseCustomEntity>(storedEntities: T[], builtInEntities: T[]): T[] {
  const normalizedEntities = storedEntities || [];
  const storedEntityIds = new Set(normalizedEntities.map((entity) => entity.id));
  const uniqueBuiltInEntities = builtInEntities.filter((entity) => !storedEntityIds.has(entity.id));
  return [...normalizedEntities, ...uniqueBuiltInEntities];
}

/**
 * Initializes built-in entities with proper timestamps for first-time storage setup.
 */
export function initializeBuiltInEntities<T extends BaseCustomEntity>(builtInEntities: T[]): T[] {
  const now = createTimestamp();
  return builtInEntities.map((entity) => ({
    ...entity,
    createdAt: now,
    updatedAt: now,
  }));
}
