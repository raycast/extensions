import { List } from "@raycast/api";
import { ChannelCategory } from "../interface/tvmodel";

export function CategoryDropdown(props: {
  categories: ChannelCategory[];
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
      <List.Dropdown.Section title="IPTV Categories">
        {categories.map((category: ChannelCategory) => (
          <List.Dropdown.Item key={category.name} title={category.name} value={category.value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
