import { Grid, Icon, List } from "@raycast/api";
import { SortOption, ViewMode } from "../types";

interface SortAndFilterDropdownProps {
  isGrid: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function SortAndFilterDropdown({ isGrid, onViewModeChange, sortBy, onSortChange }: SortAndFilterDropdownProps) {
  const handleChange = (val: string) => {
    if (val === "view_grid") {
      setTimeout(() => {
        onViewModeChange("grid");
      }, 10);
      return;
    }
    if (val === "view_list") {
      setTimeout(() => {
        onViewModeChange("list");
      }, 10);
      return;
    }
    onSortChange(val as SortOption);
  };

  if (isGrid) {
    return (
      <Grid.Dropdown tooltip="View Layout & Sorting" value={sortBy} onChange={handleChange}>
        <Grid.Dropdown.Section title="Layout">
          <Grid.Dropdown.Item title="Switch to List View" value="view_list" icon={Icon.List} />
        </Grid.Dropdown.Section>
        <Grid.Dropdown.Section title="Sort Documents">
          <Grid.Dropdown.Item title="Name (A to Z)" value="name-asc" icon={Icon.Text} />
          <Grid.Dropdown.Item title="Name (Z to A)" value="name-desc" icon={Icon.Text} />
          <Grid.Dropdown.Item title="Recent / Last Opened" value="recent" icon={Icon.Clock} />
          <Grid.Dropdown.Item title="Date Modified (Newest)" value="date-desc" icon={Icon.Calendar} />
          <Grid.Dropdown.Item title="Age (Oldest First)" value="date-asc" icon={Icon.Calendar} />
          <Grid.Dropdown.Item title="File Size (Largest)" value="size-desc" icon={Icon.HardDrive} />
          <Grid.Dropdown.Item title="File Size (Smallest)" value="size-asc" icon={Icon.HardDrive} />
        </Grid.Dropdown.Section>
      </Grid.Dropdown>
    );
  }

  return (
    <List.Dropdown tooltip="View Layout & Sorting" value={sortBy} onChange={handleChange}>
      <List.Dropdown.Section title="Layout">
        <List.Dropdown.Item title="Switch to Grid View" value="view_grid" icon={Icon.Grid} />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Sort Documents">
        <List.Dropdown.Item title="Name (A to Z)" value="name-asc" icon={Icon.Text} />
        <List.Dropdown.Item title="Name (Z to A)" value="name-desc" icon={Icon.Text} />
        <List.Dropdown.Item title="Recent / Last Opened" value="recent" icon={Icon.Clock} />
        <List.Dropdown.Item title="Date Modified (Newest)" value="date-desc" icon={Icon.Calendar} />
        <List.Dropdown.Item title="Age (Oldest First)" value="date-asc" icon={Icon.Calendar} />
        <List.Dropdown.Item title="File Size (Largest)" value="size-desc" icon={Icon.HardDrive} />
        <List.Dropdown.Item title="File Size (Smallest)" value="size-asc" icon={Icon.HardDrive} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
