import { Icon, List } from "@raycast/api";
import { type ReactNode, useState } from "react";
import { EntryListItem } from "./components/entry-list-item";
import { useContentfulSearch } from "./hooks/use-contentful-search";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const { entries, isLoading, error, spaceConfigs, contentTypes } =
    useContentfulSearch(searchText, contentTypeFilter);

  // Handle configuration error
  if (error && !spaceConfigs) {
    return (
      <List>
        <List.EmptyView
          actions={undefined}
          description={error.message}
          icon={Icon.XMarkCircle}
          title="Configuration Error"
        />
      </List>
    );
  }

  // Handle no spaces configured
  if (!isLoading && spaceConfigs && spaceConfigs.length === 0) {
    return (
      <List>
        <List.EmptyView
          actions={undefined}
          description="Please configure at least one Contentful space in the extension preferences (⌘,)"
          icon={Icon.Gear}
          title="No Spaces Configured"
        />
      </List>
    );
  }

  // Show appropriate state
  const showNoResults =
    !isLoading && searchText.trim().length >= 2 && entries.length === 0;
  const showNoEntries =
    !isLoading && entries.length === 0 && searchText.trim().length === 0;

  let listContent: ReactNode;
  if (showNoEntries) {
    listContent = (
      <List.EmptyView
        description="No entries found in configured spaces"
        icon={Icon.Document}
        title="No Entries Found"
      />
    );
  } else if (showNoResults) {
    listContent = (
      <List.EmptyView
        description={`No results found for "${searchText}"`}
        icon={Icon.MagnifyingGlass}
        title="No Results"
      />
    );
  } else {
    listContent = entries.map((entry) => (
      <EntryListItem entry={entry} key={`${entry.spaceId}-${entry.id}`} />
    ));
  }

  // Group content types by space
  const contentTypesBySpace = contentTypes.reduce(
    (acc, ct) => {
      if (!acc[ct.spaceName]) {
        acc[ct.spaceName] = [];
      }
      acc[ct.spaceName].push(ct);
      return acc;
    },
    {} as Record<string, typeof contentTypes>
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          onChange={setContentTypeFilter}
          tooltip="Filter by Content Type"
          value={contentTypeFilter}
        >
          <List.Dropdown.Item
            icon={Icon.List}
            title="All Content Types"
            value="all"
          />
          {Object.entries(contentTypesBySpace).map(([spaceName, types]) => (
            <List.Dropdown.Section key={spaceName} title={spaceName}>
              {types.map((ct) => (
                <List.Dropdown.Item
                  icon={Icon.Tag}
                  key={ct.spaceId}
                  title={ct.name}
                  value={ct.id}
                />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
      searchBarPlaceholder="Search Contentful entries..."
      throttle={true}
    >
      {listContent}
    </List>
  );
}
