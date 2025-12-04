import { List } from "@raycast/api";
import { COMMAND_CATEGORIES } from "../lib/common/constants";
export default function CategoryDropdown(props: { onSelection: (newValue: string) => void }) {
  const { onSelection } = props;
  return (
    <List.Dropdown
      tooltip="Select Command Category"
      storeValue={true}
      onChange={(newValue) => {
        onSelection(newValue);
      }}
    >
      <List.Dropdown.Item key="All" title="All" value="All" />
      {COMMAND_CATEGORIES.map((category) => (
        <List.Dropdown.Item
          key={category.name}
          title={category.name}
          value={category.name}
          icon={{ source: category.icon, tintColor: category.color }}
        />
      ))}
    </List.Dropdown>
  );
}
