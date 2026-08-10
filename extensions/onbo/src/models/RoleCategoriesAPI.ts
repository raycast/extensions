/**
 * A single role category bucket as returned by the API.
 * - name: Category name (e.g., "Software Engineering").
 * - total: Total listings in this category.
 * - active: Currently active listings in this category.
 */
export type RoleCategory = {
  name: string;
  total: number;
  active: number;
};

/**
 * Container for all role categories returned by the API.
 * - categories: Array of RoleCategory entries.
 */
export interface RoleCategories {
  categories: RoleCategory[];
}
