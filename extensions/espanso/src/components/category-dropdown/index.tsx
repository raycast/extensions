import { List } from "@raycast/api";
import { capitalCase } from "change-case";

import { CategoryDropdownProps } from "../../lib/types";

const CategoryDropdown = ({ categories, onCategoryChange }: CategoryDropdownProps) => (
  <List.Dropdown tooltip="Select Category" storeValue onChange={(newValue) => onCategoryChange(newValue)}>
    {categories.map((category) => (
      <List.Dropdown.Item key={category} title={capitalCase(category)} value={category} />
    ))}
  </List.Dropdown>
);

export default CategoryDropdown;
