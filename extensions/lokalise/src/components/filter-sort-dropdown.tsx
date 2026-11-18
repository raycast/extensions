import { List, Icon } from "@raycast/api";

export type SortOption = "name-asc" | "name-desc" | "created-desc" | "created-asc" | "modified-desc" | "modified-asc";

interface FilterSortDropdownProps {
  selectedPlatforms?: string[];
  dropdownSelection?: string;
  onChange: (value: string) => void;
}

export function FilterSortDropdown({ selectedPlatforms = [], dropdownSelection, onChange }: FilterSortDropdownProps) {
  return (
    <List.Dropdown
      tooltip="Filter & Sort"
      defaultValue="sort-created-desc"
      value={dropdownSelection}
      onChange={onChange}
      storeValue
    >
      <List.Dropdown.Section title="Filter by Platform">
        <List.Dropdown.Item
          title="All Platforms"
          value="filter-all"
          icon={selectedPlatforms.length === 0 ? Icon.CheckCircle : Icon.Circle}
        />
        <List.Dropdown.Item
          title="Web"
          value="filter-web"
          icon={selectedPlatforms.includes("web") ? Icon.CheckCircle : Icon.Circle}
        />
        <List.Dropdown.Item
          title="iOS"
          value="filter-ios"
          icon={selectedPlatforms.includes("ios") ? Icon.CheckCircle : Icon.Circle}
        />
        <List.Dropdown.Item
          title="Android"
          value="filter-android"
          icon={selectedPlatforms.includes("android") ? Icon.CheckCircle : Icon.Circle}
        />
        <List.Dropdown.Item
          title="Other"
          value="filter-other"
          icon={selectedPlatforms.includes("other") ? Icon.CheckCircle : Icon.Circle}
        />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Sort By">
        <List.Dropdown.Item title="Name (A-Z)" value="sort-name-asc" icon={Icon.ArrowUp} />
        <List.Dropdown.Item title="Name (Z-A)" value="sort-name-desc" icon={Icon.ArrowDown} />
        <List.Dropdown.Item title="Created (Newest)" value="sort-created-desc" icon={Icon.Calendar} />
        <List.Dropdown.Item title="Created (Oldest)" value="sort-created-asc" icon={Icon.Calendar} />
        <List.Dropdown.Item title="Modified (Newest)" value="sort-modified-desc" icon={Icon.Clock} />
        <List.Dropdown.Item title="Modified (Oldest)" value="sort-modified-asc" icon={Icon.Clock} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
