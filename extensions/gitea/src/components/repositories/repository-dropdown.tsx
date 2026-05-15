import { List } from "@raycast/api";
import { CommonOptionType } from "../../types/sorts/common";

export default function RepositoryDropdown(props: {
  repoFilter: CommonOptionType[];
  onFilterChange: (newValue: string) => void;
}) {
  const { repoFilter, onFilterChange } = props;
  return (
    <List.Dropdown
      tooltip="Filter repositories"
      storeValue={true}
      onChange={(newValue) => {
        onFilterChange(newValue);
      }}
    >
      <List.Dropdown.Section>
        {repoFilter.map((filter) => (
          <List.Dropdown.Item key={filter.id} title={filter.name} value={filter.value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
