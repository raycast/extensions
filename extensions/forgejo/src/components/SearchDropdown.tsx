import { List } from "@raycast/api";
import { CommonOptionType } from "../types/repo.search.type";

export default function SearchDropdown(props: {
  repoSortTypes: CommonOptionType[];
  onSearchTypeChange: (newValue: string) => void;
}) {
  const { repoSortTypes, onSearchTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Search Type"
      storeValue={true}
      onChange={(newValue) => {
        onSearchTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Search Type">
        {repoSortTypes.map((sortType) => (
          <List.Dropdown.Item key={sortType.id} title={sortType.name} value={sortType.value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
