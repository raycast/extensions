import { List } from "@raycast/api";

export type SearchCategory = "all" | "extensions" | "generator" | "premium";

const categories = ["All", "Extensions", "Generator", "Premium"] as const;

export default function CategoryDropdown({
  onCategoryChange,
}: {
  onCategoryChange: (newCategory: SearchCategory) => void;
}) {
  return (
    <List.Dropdown
      filtering={false}
      placeholder="Select category..."
      tooltip="Select category"
      storeValue={true}
      onChange={(newValue) => {
        onCategoryChange(newValue as SearchCategory);
      }}
    >
      {categories.map((category) => (
        <List.Dropdown.Item key={category.toLowerCase()} title={category} value={category.toLowerCase()} />
      ))}
    </List.Dropdown>
  );
}
