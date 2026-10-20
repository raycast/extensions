import { Action, Icon } from "@raycast/api";
import { CreateCategoryForm } from "./CreateCategoryForm";
import { getCategoryParentId, isCustomCategory, isParentCategory } from "../lib/category-utils";
import type { Category } from "../lib/types";

/** Edit a budget's category from budget views. Moneytree only allows editing custom categories. */
export function EditCategoryAction({
  category,
  categories,
  onSaved,
}: {
  category: Category;
  categories: Category[];
  onSaved?: () => void;
}) {
  if (!isCustomCategory(category)) return null;
  const parentOptions = categories
    .filter((item) => !isCustomCategory(item) && isParentCategory(item))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Action.Push
      title="Edit Category"
      icon={Icon.Tag}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "e" },
        Windows: { modifiers: ["ctrl", "shift"], key: "e" },
      }}
      target={
        <CreateCategoryForm
          categories={parentOptions}
          category={category}
          defaultParentId={getCategoryParentId(category)}
          defaultIconKey={category.icon_key || "uncategorized"}
          onSaved={onSaved}
        />
      }
    />
  );
}
