import { Icon, List } from "@raycast/api";

import { Error as ErrorGuide } from "./Error";
import { CategoryName } from "../types";
import { getCategoryIcon, useCategories } from "../utils";

export const DEFAULT_CATEGORY = "null";

export function Categories({ onCategoryChange }: { onCategoryChange: (newCategory: string) => void }) {
  const { data, error, isLoading } = useCategories();

  if (error) return <ErrorGuide />;
  return (
    <List.Dropdown
      defaultValue={DEFAULT_CATEGORY}
      isLoading={isLoading}
      onChange={onCategoryChange}
      tooltip="Select Category"
      storeValue
    >
      <List.Dropdown.Item key={"000"} icon={Icon.AppWindowGrid3x3} title="All Categories" value={DEFAULT_CATEGORY} />
      {(data || []).map((category) => (
        <List.Dropdown.Item
          key={category.uuid}
          icon={getCategoryIcon(category.name.replaceAll(" ", "_").toUpperCase() as CategoryName)}
          title={category.name}
          value={category.name}
        />
      ))}
    </List.Dropdown>
  );
}
