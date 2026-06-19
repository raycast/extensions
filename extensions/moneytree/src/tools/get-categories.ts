import { getCachedCategories } from "../lib/moneytree";

type Input = {
  /**
   * Filter categories by type: expense, income, or null/other.
   */
  categoryType?: string;
  /**
   * Restrict categories to children of a Moneytree parent category id.
   */
  parentId?: number;
  /**
   * Include custom user-created categories. Defaults to true.
   */
  includeCustom?: boolean;
};

/**
 * Get Moneytree transaction categories with ids for transaction updates and custom subcategory creation.
 */
export default async function tool(input: Input = {}) {
  const includeCustom = input.includeCustom !== false;
  const categories = await getCachedCategories();
  const parentById = new Map(categories.map((category) => [category.id, category]));
  const filtered = categories.filter((category) => {
    if (input.categoryType && category.category_type !== input.categoryType) return false;
    if (input.parentId && category.parent_id !== input.parentId) return false;
    if (!includeCustom && category.guest_id !== 0) return false;
    return true;
  });

  return {
    count: filtered.length,
    categories: filtered.map((category) => ({
      id: category.id,
      name: category.name,
      parentId: category.parent_id,
      parentName: category.parent_id ? parentById.get(category.parent_id)?.name : undefined,
      categoryType: category.category_type,
      iconKey: category.icon_key,
      isCustom: category.guest_id !== 0,
    })),
  };
}
