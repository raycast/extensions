import { ActionPanel, List } from "@raycast/api";
import { FieldGroup, FilterOption } from "../types";
import { ViewActions } from "./ViewActions";

interface ViewInstancesEmptyViewProps {
  pageSize: number;
  setPageSize: (size: number) => void;
  showArchived: boolean;
  toggleShowArchived: () => void;
  searchText: string;
  entityHasNoInstances?: boolean;
  selectedFilter?: FilterOption | null;
  onSelectFilter?: (filter: FilterOption | null) => void;
  fieldGroups?: FieldGroup[];
  isLoading?: boolean;
  organization?: string;
}

/**
 * Empty view component displayed when no instances are found
 * Provides contextual messages and actions based on current state
 */
export function ViewInstancesEmptyView({
  pageSize,
  setPageSize,
  showArchived,
  toggleShowArchived,
  searchText,
  entityHasNoInstances = false,
  selectedFilter = null,
  onSelectFilter,
  fieldGroups = [],
  isLoading = false,
  organization,
}: ViewInstancesEmptyViewProps) {
  const isUsingFieldFilter = selectedFilter !== null;
  const filterName = selectedFilter ? selectedFilter.fieldName : "All Fields";

  let title: string;
  let description: string;

  if (isUsingFieldFilter) {
    if (isLoading && searchText) {
      title = "Searching...";
      description = `Looking for "${searchText}" in ${filterName}`;
    } else {
      title = searchText ? "No matching instances" : "Enter search term";
      description = searchText
        ? `No instances match "${searchText}" in ${filterName}`
        : `Type to search by ${filterName}`;
    }
  } else {
    title = "No instances found";
    description = entityHasNoInstances
      ? "This entity has no instances"
      : searchText
        ? showArchived
          ? "Try adjusting your search criteria"
          : "Try adjusting your search or showing archived instances"
        : showArchived
          ? "This entity has no instances"
          : "Try showing archived instances";
  }

  return (
    <List.EmptyView
      icon={{ source: "icons/empty-view-icon.png" }}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <ViewActions
            pageSize={pageSize}
            setPageSize={setPageSize}
            showArchived={showArchived}
            toggleShowArchived={toggleShowArchived}
            fieldGroups={fieldGroups}
            selectedFilter={selectedFilter}
            onSelectFilter={onSelectFilter}
            organization={organization}
          />
        </ActionPanel>
      }
    />
  );
}
