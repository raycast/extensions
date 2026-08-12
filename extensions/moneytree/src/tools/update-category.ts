import { getCachedCategories, updateCustomCategory } from "../lib/moneytree";

type Input = {
  /**
   * Existing custom Moneytree category id from get-categories.
   */
  categoryId: number;
  /**
   * Existing Moneytree category id to use as the parent category. Defaults to the category's current parent.
   */
  parentId?: number;
  /**
   * New name for the custom category. Defaults to the category's current name.
   */
  name?: string;
  /**
   * Moneytree icon key. Defaults to the category's current icon.
   */
  iconKey?: string;
};

/**
 * Update a custom Moneytree category's name, parent, and icon. This mutates Moneytree data.
 */
export default async function tool(input: Input) {
  if (!input.categoryId) {
    throw new Error("categoryId is required; use get-categories first to find the custom category id");
  }
  if (!input.name && !input.parentId && !input.iconKey) {
    throw new Error("At least one of name, parentId, or iconKey is required to update a Moneytree category");
  }

  const categories = await getCachedCategories();
  const category = categories.find((candidate) => candidate.id === input.categoryId);
  if (!category) {
    throw new Error(`Category #${input.categoryId} was not found`);
  }
  if (category.guest_id === 0) {
    throw new Error("Only custom Moneytree categories can be updated");
  }

  const parentId = input.parentId ?? category.parent_id;
  if (!parentId) {
    throw new Error("parentId is required because this category does not have a current parent");
  }

  const parent = categories.find((candidate) => candidate.id === parentId);
  if (!parent) {
    throw new Error(`Parent category #${parentId} was not found`);
  }
  if (parent.parent_id !== null) {
    throw new Error("parentId must be a top-level Moneytree category; child categories cannot be parent categories");
  }

  const updatedCategory = await updateCustomCategory({
    categoryId: input.categoryId,
    parentId,
    name: input.name?.trim() || category.name,
    iconKey: input.iconKey || category.icon_key,
  });

  return {
    category: {
      id: updatedCategory.id,
      name: updatedCategory.name,
      parentId: updatedCategory.parent_id,
      categoryType: updatedCategory.category_type,
      iconKey: updatedCategory.icon_key,
      isCustom: updatedCategory.guest_id !== 0,
      updatedAt: updatedCategory.updated_at,
    },
  };
}
