import { List } from "@raycast/api";
import type { Option } from "../../domain/options";

type RepositoryDropdownProps<TValue extends string> = {
  repoFilter: readonly Option<TValue>[];
  onFilterChange: (newValue: TValue) => void;
};

export default function RepositoryDropdown<TValue extends string>({
  repoFilter,
  onFilterChange,
}: RepositoryDropdownProps<TValue>) {
  return (
    <List.Dropdown
      tooltip="Filter repositories"
      onChange={(newValue) => {
        onFilterChange(newValue as TValue);
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
