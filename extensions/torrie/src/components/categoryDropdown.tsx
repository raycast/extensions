import { List } from "@raycast/api";
import { Category } from "../interface/topCategories";

export function CategoryDropdown(props: {
  categories: Category[];
  onCategoryTypeChange: (categoryValue: string) => void;
}) {
  const { categories, onCategoryTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Category"
      storeValue={true}
      onChange={(categoryValue) => {
        onCategoryTypeChange(categoryValue);
      }}
    >
      <List.Dropdown.Section title="Torrent Categories">
        {categories.map((category: Category) => (
          <List.Dropdown.Item key={category.title} title={category.title} value={category.value} icon={category.icon} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
