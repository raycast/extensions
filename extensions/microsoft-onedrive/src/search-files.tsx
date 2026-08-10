import { List } from "@raycast/api";
import { DriveDropdown } from "./components/DriveDropdown";
import { FileListEmptyView } from "./components/FileListEmptyView";
import { FileListItem } from "./components/FileListItem";
import { useSearchFiles } from "./hooks/useSearchFiles";

export default function SearchFiles() {
  const {
    isLoading,
    searchText,
    items,
    currentFolder,
    currentDrive,
    selectedDriveId,
    nextLink,
    installedOfficeApps,
    oneDriveDrives,
    sharepointSites,
    sortConfig,
    setSearchText,
    navigateDown,
    navigateUp,
    handleDriveChange,
    handleLoadMore,
    handleDelete,
    handleDownload,
    handleReveal,
    handleCreateShareLink,
    handleUploadComplete,
    handleSortChange,
  } = useSearchFiles();

  const totalDrives = oneDriveDrives.length + sharepointSites.reduce((sum, [, drives]) => sum + drives.length, 0);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail
      navigationTitle={currentDrive?.siteDisplayName ? `Search ${currentDrive.siteDisplayName}` : undefined}
      searchBarPlaceholder={currentDrive?.siteDisplayName ? "Search library" : "Search drive"}
      searchBarAccessory={
        totalDrives > 1 ? (
          <DriveDropdown
            oneDriveDrives={oneDriveDrives}
            sharepointSites={sharepointSites}
            selectedDriveId={selectedDriveId}
            onDriveChange={handleDriveChange}
          />
        ) : undefined
      }
      pagination={{
        hasMore: !!nextLink,
        onLoadMore: handleLoadMore,
        pageSize: 20,
      }}
    >
      {items.length === 0 ? (
        <FileListEmptyView
          isLoading={isLoading}
          searchText={searchText}
          currentFolder={currentFolder}
          currentDrive={currentDrive}
          onNavigateUp={navigateUp}
          onUploadComplete={handleUploadComplete}
        />
      ) : (
        <List.Section title={items.length === 1 ? "Item" : "Items"} subtitle={`${items.length}`}>
          {items.map((item) => (
            <FileListItem
              key={item.id}
              item={item}
              searchText={searchText}
              currentFolder={currentFolder}
              currentDrive={currentDrive}
              installedOfficeApps={installedOfficeApps}
              sortConfig={sortConfig}
              onNavigateDown={navigateDown}
              onNavigateUp={navigateUp}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onReveal={handleReveal}
              onCreateShareLink={handleCreateShareLink}
              onUploadComplete={handleUploadComplete}
              onSortChange={handleSortChange}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
