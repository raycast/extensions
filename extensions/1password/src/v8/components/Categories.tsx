import { Icon, List } from "@raycast/api";

import { CategoryName } from "../types";
import { getCategoryIcon, useCategories } from "../utils";
import { Error as ErrorGuide } from "./Error";

export const DEFAULT_CATEGORY = "null";
export function Categories({ onCategoryChange }: { onCategoryChange: (newCategory: string) => void }) {
  const { data, error, isLoading } = useCategories();

  if (error) return <ErrorGuide />;
  return (
    <List.Dropdown
      defaultValue={DEFAULT_CATEGORY}
      isLoading={isLoading}
      onChange={onCategoryChange}
      storeValue
      tooltip="Select Category"
    >
      <List.Dropdown.Item icon={Icon.AppWindowGrid3x3} key={"000"} title="All Categories" value={DEFAULT_CATEGORY} />
      {(data || []).map((category) => (
        <List.Dropdown.Item
          icon={getCategoryIcon(category.name.replaceAll(" ", "_").toUpperCase() as CategoryName)}
          key={category.uuid}
          title={category.name}
          value={category.name}
        />
      ))}
    </List.Dropdown>
  );
}
