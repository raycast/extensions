import { Icon, List } from "@raycast/api";

import { CategoryName } from "../types";
import { getV7CategoryIcon, getV7Items } from "../utils";

export const DEFAULT_CATEGORY = "null";

export function Categories({ onCategoryChange }: { onCategoryChange: (newCategory: string) => void }) {
  const categoriesObj = getV7Items();
  const categories = categoriesObj && Object.keys(categoriesObj).sort((a, b) => a.localeCompare(b));

  return (
    <List.Dropdown defaultValue="null" onChange={onCategoryChange} tooltip="Select Category" storeValue>
      <List.Dropdown.Section title="Item Categories">
        <List.Dropdown.Item key={"000"} icon={Icon.AppWindowGrid3x3} title="All Categories" value={DEFAULT_CATEGORY} />
        {(categories || []).map((category, idx) => (
          <List.Dropdown.Item
            key={idx}
            icon={getV7CategoryIcon(category.replaceAll(" ", "_").toUpperCase() as CategoryName)}
            title={category}
            value={category}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
