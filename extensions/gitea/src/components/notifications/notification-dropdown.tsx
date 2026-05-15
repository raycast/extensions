import { List } from "@raycast/api";
import { CommonOptionType } from "../../types/sorts/common";

export default function NotificationDropdown(props: {
  notifyFilter: CommonOptionType[];
  onFilterChange: (newValue: string) => void;
}) {
  const { notifyFilter, onFilterChange } = props;
  return (
    <List.Dropdown
      tooltip="Filter notifications"
      storeValue={true}
      onChange={(newValue) => {
        onFilterChange(newValue);
      }}
    >
      <List.Dropdown.Section>
        {notifyFilter.map((filter) => (
          <List.Dropdown.Item key={filter.id} title={filter.name} value={filter.value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
