/**
 * Generic entity list helpers for common CRUD operations
 * Used by Template and Tone managers to avoid code duplication
 */

import { formatStringTemplate } from "@/utils/validation";

/**
 * Minimal entity interface for filtering - only requires id and name
 */
export interface MinimalEntity {
  id: string;
  name: string;
}

/**
 * Filters entities based on search text across specified fields
 * @param entities Array of entities to filter
 * @param searchText Search query string
 * @param searchFields Fields to search within (e.g., ['name', 'guidelines'])
 * @returns Filtered array of entities
 */
export function filterEntities<T extends MinimalEntity>(
  entities: T[],
  searchText: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchText.trim()) return entities;

  const searchLower = searchText.trim().toLowerCase();
  return entities.filter((entity) =>
    searchFields.some((field) => {
      const value = entity[field];
      if (typeof value === "string") {
        return value.toLowerCase().includes(searchLower);
      }
      return false;
    })
  );
}

/**
 * Creates a temporary entity object for new entity creation
 * @param defaults Default values for the entity
 * @returns Temporary entity object with defaults applied and timestamp fields
 */
export function createTempEntity<T>(defaults: T): T & { createdAt: string; updatedAt: string } {
  return {
    ...defaults,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculates the display count message for entities
 * @param count Number of filtered entities
 * @param entityName Name of the entity type (e.g., "templates", "tones")
 * @returns Formatted count message
 */
export function getEntityCountMessage(count: number, entityName: string): string {
  return formatStringTemplate(`${entityName} ({count})`, "count", count);
}

/**
 * Determines if the empty view should be shown
 * @param entities Array of filtered entities
 * @param isLoading Loading state
 * @returns Boolean indicating if empty view should be displayed
 */
export function shouldShowEmptyView<T>(entities: T[], isLoading: boolean): boolean {
  return !isLoading && entities.length === 0;
}
