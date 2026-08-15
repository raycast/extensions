import { List } from "@raycast/api";
import { Category, DeviceDisplayCategory } from "../types";

interface SearchBarProps {
  selectedCategory: DeviceDisplayCategory;
  onCategoryChange: (category: DeviceDisplayCategory) => void;
  categories: Category[];
  showDropdown: boolean;
}

export function SearchBar({ selectedCategory, onCategoryChange, categories, showDropdown }: SearchBarProps) {
  if (showDropdown) {
    const handleCategoryChange = (value: string) => onCategoryChange(value as DeviceDisplayCategory);

    return (
      <List.Dropdown tooltip="Filter by device type" value={selectedCategory} onChange={handleCategoryChange}>
        {categories.map((category) => (
          <List.Dropdown.Item key={category.id} title={category.name} value={category.id} />
        ))}
      </List.Dropdown>
    );
  }

  return null;
}
