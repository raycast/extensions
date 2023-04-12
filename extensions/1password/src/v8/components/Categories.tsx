import { Icon, List } from "@raycast/api";

import { Guide } from "./Guide";
import { Category, CategoryName } from "../types";
import { CATEGORIES_CACHE_NAME, getCategoryIcon, useOp } from "../utils";

export const DEFAULT_CATEGORY = "null";

export function Categories({ onCategoryChange }: { onCategoryChange: (newCategory: string) => void }) {
  const { data, error, isLoading } = useOp<Category[]>(["item", "template", "list"], CATEGORIES_CACHE_NAME);

  if (error) return <Guide />;
  return !isLoading ? (
    <List.Dropdown defaultValue={DEFAULT_CATEGORY} onChange={onCategoryChange} tooltip="Select Category" storeValue>
      <List.Dropdown.Item key={"000"} icon={Icon.AppWindowGrid3x3} title="All Categories" value={DEFAULT_CATEGORY} />
      {(data || [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((category) => (
          <List.Dropdown.Item
            key={category.uuid}
            icon={getCategoryIcon(category.name.replaceAll(" ", "_").toUpperCase() as CategoryName)}
            title={category.name}
            value={category.name}
          />
        ))}
    </List.Dropdown>
  ) : null;
}
