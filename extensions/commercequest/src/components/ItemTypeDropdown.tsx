import { ItemType } from "../lib/types";
import { List } from "@raycast/api";

export default function ItemTypeDropdown(props: {
  itemTypes: ItemType[];
  onItemTypeChange: (newValue: string) => void;
}) {
  const { itemTypes, onItemTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Type"
      defaultValue=""
      storeValue={true}
      onChange={(newValue) => {
        onItemTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Item Types">
        {itemTypes.map((itemType) => (
          <List.Dropdown.Item key={itemType.id} title={itemType.name} value={itemType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
