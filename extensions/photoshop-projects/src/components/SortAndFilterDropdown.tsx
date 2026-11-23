import { Grid, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { SortOption, ViewMode } from "../types";
import { getMountedDrives, MountedDrive } from "../utils/drives";

interface SortAndFilterDropdownProps {
  isGrid: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectedLocation?: string;
  onLocationChange?: (location: string) => void;
}

export function SortAndFilterDropdown({
  isGrid,
  onViewModeChange,
  sortBy,
  onSortChange,
  selectedLocation = "global",
  onLocationChange,
}: SortAndFilterDropdownProps) {
  const [mountedDrives, setMountedDrives] = useState<MountedDrive[]>([]);

  useEffect(() => {
    try {
      const drives = getMountedDrives();
      setMountedDrives(drives);
    } catch {
      setMountedDrives([]);
    }
  }, []);

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
    if (val.startsWith("loc_")) {
      const loc = val.slice(4);
      if (onLocationChange) {
        onLocationChange(loc);
      }
      return;
    }
    onSortChange(val as SortOption);
  };

  const dropdownValue = selectedLocation && selectedLocation !== "global" ? `loc_${selectedLocation}` : sortBy;

  if (isGrid) {
    return (
      <Grid.Dropdown tooltip="View Layout, Drive & Sorting" value={dropdownValue} onChange={handleChange}>
        <Grid.Dropdown.Section title="Layout">
          <Grid.Dropdown.Item title="Switch to List View" value="view_list" icon={Icon.List} />
        </Grid.Dropdown.Section>
        <Grid.Dropdown.Section title="Search Location">
          <Grid.Dropdown.Item title="Global (All Locations)" value="loc_global" icon={Icon.Globe} />
          <Grid.Dropdown.Item title="Macintosh HD (System)" value="loc_system" icon={Icon.HardDrive} />
          {mountedDrives
            .filter((d) => d.id !== "global" && d.id !== "system")
            .map((d) => (
              <Grid.Dropdown.Item key={d.id} title={d.name} value={`loc_${d.id}`} icon={Icon.HardDrive} />
            ))}
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
    <List.Dropdown tooltip="View Layout, Drive & Sorting" value={dropdownValue} onChange={handleChange}>
      <List.Dropdown.Section title="Layout">
        <List.Dropdown.Item title="Switch to Grid View" value="view_grid" icon={Icon.AppWindowGrid2x2} />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Search Location">
        <List.Dropdown.Item title="Global (All Locations)" value="loc_global" icon={Icon.Globe} />
        <List.Dropdown.Item title="Macintosh HD (System)" value="loc_system" icon={Icon.HardDrive} />
        {mountedDrives
          .filter((d) => d.id !== "global" && d.id !== "system")
          .map((d) => (
            <List.Dropdown.Item key={d.id} title={d.name} value={`loc_${d.id}`} icon={Icon.HardDrive} />
          ))}
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
