import { List } from "@raycast/api";

export function CategoryDropdown(props: {
  categories: string[];
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
      <List.Dropdown.Section title="Game Categories">
        {categories.map((category: string) => (
          <List.Dropdown.Item key={category} title={category} value={"/tag-" + category} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
