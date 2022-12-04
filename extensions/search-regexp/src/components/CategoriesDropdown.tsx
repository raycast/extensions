import { List } from "@raycast/api";
import { Category } from "../types";

export default function CategoriesDropdown({
  categories,
  onCategoryChange,
}: {
  categories: Category[];
  onCategoryChange: (newCategory: string) => void;
}): JSX.Element {
  return (
    <List.Dropdown tooltip="Select category" storeValue={false} onChange={onCategoryChange}>
      <List.Dropdown.Section title="Regexp categories">
        {categories.map(({ shortname, displayName }: Category) => (
          <List.Dropdown.Item key={shortname} title={displayName} value={shortname} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
