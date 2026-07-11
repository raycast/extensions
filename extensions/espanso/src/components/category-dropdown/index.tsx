import { List } from "@raycast/api";

import { CategoryDropdownProps } from "../../lib/types";
import { formatCategoryName } from "../../lib/utils";

const CategoryDropdown = ({ categories, onCategoryChange, separator }: CategoryDropdownProps) => (
  <List.Dropdown tooltip="Select Category" storeValue onChange={(newValue) => onCategoryChange(newValue)}>
    {categories.map((category) => (
      <List.Dropdown.Item key={category} title={formatCategoryName(category, separator)} value={category} />
    ))}
  </List.Dropdown>
);

export default CategoryDropdown;
