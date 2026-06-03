import { createCustomCategory } from "../lib/moneytree";

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
