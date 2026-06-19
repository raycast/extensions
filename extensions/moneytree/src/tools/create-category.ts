import { createCustomCategory, getCachedCategories } from "../lib/moneytree";

type Input = {
  /**
   * Existing Moneytree category id to create this custom subcategory under. Required.
   */
  parentId: number;
  /**
   * Name for the custom subcategory.
   */
  name: string;
  /**
   * Moneytree icon key. Defaults to uncategorized.
   */
  iconKey?: string;
};

/**
 * Create a custom Moneytree subcategory under an existing parent category. This mutates Moneytree data.
 */
export default async function tool(input: Input) {
  if (!input.parentId) {
    throw new Error("parentId is required to create a Moneytree subcategory");
  }

  const name = input.name?.trim();
  if (!name) {
    throw new Error("name is required to create a Moneytree subcategory");
  }

  const categories = await getCachedCategories();
  const parent = categories.find((category) => category.id === input.parentId);
  if (!parent) {
    throw new Error(`Parent category #${input.parentId} was not found`);
  }
  if (parent.parent_id !== null) {
    throw new Error("parentId must be a top-level Moneytree category; child categories cannot be parent categories");
  }

  const category = await createCustomCategory({
    parentId: input.parentId,
    name,
    iconKey: input.iconKey,
  });

  return {
    category: {
      id: category.id,
      name: category.name,
      parentId: category.parent_id,
      categoryType: category.category_type,
      iconKey: category.icon_key,
      isCustom: category.guest_id !== 0,
      createdAt: category.created_at,
    },
  };
}
