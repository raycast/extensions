import { List } from "@raycast/api";
import { Category } from "../types";

interface SearchBarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: Category[];
  showDropdown: boolean;
}

export function SearchBar({ selectedCategory, onCategoryChange, categories, showDropdown }: SearchBarProps) {
  if (showDropdown) {
    return (
      <List.Dropdown tooltip="Filter by device type" value={selectedCategory} onChange={onCategoryChange}>
        {categories.map((category) => (
          <List.Dropdown.Item key={category.id} title={category.name} value={category.id} />
        ))}
      </List.Dropdown>
    );
  }

  return null;
}
