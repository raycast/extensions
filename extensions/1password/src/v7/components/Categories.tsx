import { Icon, List } from "@raycast/api";

import { CategoryName } from "../types";
import { getV7CategoryIcon, getV7Items } from "../utils";

export const DEFAULT_CATEGORY = "null";
export function Categories({ onCategoryChange }: { onCategoryChange: (newCategory: string) => void }) {
  const categoriesObj = getV7Items();
  const categories = categoriesObj && Object.keys(categoriesObj).sort((a, b) => a.localeCompare(b));

  return (
    <List.Dropdown defaultValue="null" onChange={onCategoryChange} storeValue tooltip="Select Category">
      <List.Dropdown.Section title="Item Categories">
        <List.Dropdown.Item icon={Icon.AppWindowGrid3x3} key={"000"} title="All Categories" value={DEFAULT_CATEGORY} />
        {(categories || []).map((category, idx) => (
          <List.Dropdown.Item
            icon={getV7CategoryIcon(category.replaceAll(" ", "_").toUpperCase() as CategoryName)}
            key={idx}
            title={category}
            value={category}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
