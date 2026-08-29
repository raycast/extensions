import React from "react";
import { Icon, List } from "@raycast/api";
import { DriveTypeFilter } from "./types/storage";
import { formatBytes } from "./utils/formatters";
import { useStorage } from "./hooks/useStorage";
import { DriveListItem } from "./components/DriveListItem";
import { EmptyStorageView } from "./components/EmptyStorageView";

export default function ViewStorageCommand(): JSX.Element {
  const {
    drives,
    overview,
    isLoading,
    error,
    filter,
    setFilter,
    searchText,
    setSearchText,
    isShowingDetail,
    toggleDetail,
    revalidate,
    ejectDriveOptimistic,
  } = useStorage();

  const handleResetFilters = () => {
    setFilter("all");
    setSearchText("");
  };

  const sectionSubtitle = overview
    ? `${drives.length} of ${overview.totalDrives} ${overview.totalDrives === 1 ? "drive" : "drives"} · ${formatBytes(overview.totalFreeBytes)} total free`
    : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter drives by letter, label, model, or filesystem..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Drive Category"
          value={filter}
          onChange={(val) => setFilter(val as DriveTypeFilter)}
        >
          <List.Dropdown.Item
            title="All Drives"
            value="all"
            icon={Icon.HardDrive}
          />
          <List.Dropdown.Item
            title="Internal Drives (SSD / HDD)"
            value="internal"
            icon={Icon.HardDrive}
          />
          <List.Dropdown.Item
            title="Removable Drives (USB)"
            value="removable"
            icon={Icon.MemoryStick}
          />
          <List.Dropdown.Item
            title="Network Drives"
            value="network"
            icon={Icon.Network}
          />
          <List.Dropdown.Item
            title="Virtual / Optical Drives"
            value="virtual"
            icon={Icon.Cd}
          />
        </List.Dropdown>
      }
    >
      {drives.length === 0 ? (
        <EmptyStorageView
          filter={filter}
          searchText={searchText}
          isLoading={isLoading}
          error={error}
          onRefresh={revalidate}
          onResetFilter={handleResetFilters}
        />
      ) : (
        <List.Section
          title="Connected Storage Drives"
          subtitle={sectionSubtitle}
        >
          {drives.map((drive) => (
            <DriveListItem
              key={drive.id}
              drive={drive}
              isShowingDetail={isShowingDetail}
              onToggleDetail={toggleDetail}
              onRefresh={revalidate}
              onEject={() => ejectDriveOptimistic(drive.id)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
