import { ActionPanel, Color, getPreferenceValues, LaunchProps, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { InstanceActions } from "./components/InstanceActions";
import { InstanceDetail } from "./components/InstanceDetail";
import { ViewActions } from "./components/ViewActions";
import { ViewInstancesEmptyView } from "./components/ViewInstancesEmptyView";
import { useEntities } from "./hooks/useEntities";
import { useEntityData } from "./hooks/useEntityData";
import { useFilteredEntityData } from "./hooks/useFilteredEntityData";
import { filterInstances } from "./services/searchService";
import { FilterOption } from "./types";

/**
 * Main command component for viewing entity instances
 * Provides entity selection, search, pagination, and instance details
 * Displays instances with their metadata and supports various actions
 */
export default function Command(props: LaunchProps<{ launchContext?: { entity?: string } }>) {
  // Keep cached state for persistence between sessions
  const [cachedEntity, setCachedEntity] = useCachedState<string>("selectedEntity", "");
  // Use local state for UI reactivity
  const [selectedEntity, setSelectedEntity] = useState<string>(cachedEntity);
  const [searchText, setSearchText] = useCachedState<string>("searchText", "");
  const [pageSize, setPageSize] = useCachedState<number>("pageSize", 25);
  const [showArchived, setShowArchived] = useCachedState<boolean>("showArchived", false);
  const [selectedFilter, setSelectedFilter] = useCachedState<FilterOption | null>("selectedFilter", null);

  // Update the cached state when the local state changes
  useEffect(() => {
    if (selectedEntity !== cachedEntity) {
      setCachedEntity(selectedEntity);
    }
  }, [selectedEntity, cachedEntity, setCachedEntity]);

  // If an entity was passed in the context, use it for both states
  useEffect(() => {
    if (props.launchContext?.entity) {
      setSelectedEntity(props.launchContext.entity);
      setCachedEntity(props.launchContext.entity);
    }
  }, [props.launchContext, setCachedEntity]);

  const isSearching = searchText.trim().length > 0;
  const isUsingFieldFilter = selectedFilter !== null;

  // Fetch entities
  const { data: entitiesResponse, isLoading: isLoadingEntities } = useEntities();

  // Ensure entities is always an array
  const entities = Array.isArray(entitiesResponse) ? entitiesResponse : [];
  const nonProtectedEntities = entities.filter((entity) => entity.protected_entity === "0");

  // Auto-select first entity on first-time use (when no selected entity)
  useEffect(() => {
    if (nonProtectedEntities.length > 0 && selectedEntity === "" && !isLoadingEntities) {
      const firstEntity = nonProtectedEntities[0].entity_data_name;
      setSelectedEntity(firstEntity);
      setCachedEntity(firstEntity);
    }
  }, [nonProtectedEntities, isLoadingEntities, selectedEntity, setCachedEntity]);

  // Fetch entity data with pagination (for "All Fields" filter)
  const {
    data: entityData,
    isLoading: isLoadingEntityData,
    pagination: originalPagination,
    revalidate: revalidateEntityData,
  } = useEntityData(selectedEntity, pageSize, showArchived);

  // Fetch filtered entity data (for field-specific filters)
  const {
    data: filteredData,
    isLoading: isLoadingFilteredData,
    pagination: filteredPagination,
    revalidate: revalidateFilteredData,
  } = useFilteredEntityData(
    isUsingFieldFilter ? selectedEntity : "", // Only fetch if using field filter
    selectedFilter?.fieldDataName || null,
    selectedFilter?.fieldTypeName || null,
    selectedFilter?.operator || null,
    isUsingFieldFilter && isSearching ? searchText : null,
    pageSize,
    showArchived,
  );

  // Determine which data to use based on the selected filter
  const instances = isUsingFieldFilter
    ? isSearching
      ? filteredData?.data || []
      : [] // Only show results when searching with field filter
    : entityData.data;

  const isLoading = isLoadingEntities || (isUsingFieldFilter ? isLoadingFilteredData : isLoadingEntityData);

  // Filter instances based on search text (only for "All Fields" filter)
  const filteredInstances = isUsingFieldFilter ? instances : filterInstances(instances, searchText);

  const toggleShowArchived = () => setShowArchived(!showArchived);

  // Handle filter selection
  const handleSelectFilter = (filter: FilterOption | null) => {
    setSelectedFilter(filter);
    setSearchText("");
  };

  // Track if the data is actually ready to display
  const isDataReady = !isLoadingEntities && !isLoading && selectedEntity !== "";

  // Determine if we should show the empty view
  const showEmptyView =
    (isDataReady || (isUsingFieldFilter && isLoading)) &&
    (filteredInstances.length === 0 || (isUsingFieldFilter && !isSearching)); // Show empty view for field filter until user searches

  // Check if the entity has no instances at all (even with archived shown)
  const entityHasNoInstances = isDataReady && entityData.data.length === 0 && showArchived;

  // Use the appropriate pagination based on the filter type
  const pagination = isUsingFieldFilter ? filteredPagination : originalPagination;

  // Create a modified pagination object that prevents loading more when searching with "All Fields" filter
  const modifiedPagination = isUsingFieldFilter
    ? pagination
    : {
        ...pagination,
        onLoadMore: isSearching ? () => {} : pagination.onLoadMore,
      };

  // Handle entity selection from dropdown
  const handleEntityChange = (newEntity: string) => {
    setSelectedEntity(newEntity);
    setCachedEntity(newEntity);

    // Reset search and filter when entity changes
    setSearchText("");
    setSelectedFilter(null);
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={
        isUsingFieldFilter && selectedFilter ? `Filter by ${selectedFilter.fieldName}` : "Filter instance by name"
      }
      onSearchTextChange={setSearchText}
      pagination={modifiedPagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Select entity" value={selectedEntity} onChange={handleEntityChange}>
          <List.Dropdown.Section title="Entities">
            {nonProtectedEntities.map((entity) => (
              <List.Dropdown.Item
                key={entity.entity_data_name}
                title={entity.entity_name}
                value={entity.entity_data_name}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      filtering={false}
      throttle
    >
      {showEmptyView ? (
        <ViewInstancesEmptyView
          pageSize={pageSize}
          setPageSize={setPageSize}
          showArchived={showArchived}
          toggleShowArchived={toggleShowArchived}
          searchText={searchText}
          entityHasNoInstances={!isUsingFieldFilter && entityHasNoInstances}
          selectedFilter={selectedFilter}
          onSelectFilter={handleSelectFilter}
          fieldGroups={entityData.data[0]?.instance_data.field_groups || []}
          isLoading={isLoading}
          organization={getPreferenceValues().organization}
        />
      ) : (
        <List.Section
          title="Instances"
          subtitle={`${filteredInstances.length} of ${isUsingFieldFilter ? filteredData?.info.total_count || 0 : entityData.info.total_count}`}
        >
          {filteredInstances.map((instance) => (
            <List.Item
              key={instance.instance_data._id}
              title={{
                value: instance.instance_data.ui_data.name,
                tooltip: `Created on ${new Date(instance.instance_data.insertTimestamp).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  hour12: false,
                })}`,
              }}
              detail={<InstanceDetail fieldGroups={instance.instance_data.field_groups} />}
              actions={
                <ActionPanel>
                  <ViewActions
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    showArchived={showArchived}
                    toggleShowArchived={toggleShowArchived}
                    fieldGroups={instance.instance_data.field_groups}
                    selectedFilter={selectedFilter}
                    onSelectFilter={handleSelectFilter}
                    organization={getPreferenceValues().organization}
                  />
                  <InstanceActions
                    instanceId={instance.instance_data._id}
                    instanceData={instance.instance_data}
                    selectedEntity={selectedEntity}
                    onArchiveToggle={() => {
                      // Refresh the data after archive/unarchive
                      if (isUsingFieldFilter) {
                        revalidateFilteredData();
                      } else {
                        revalidateEntityData();
                      }
                    }}
                    onDelete={() => {
                      // Refresh the data after deletion
                      if (isUsingFieldFilter) {
                        revalidateFilteredData();
                      } else {
                        revalidateEntityData();
                      }
                    }}
                  />
                </ActionPanel>
              }
              accessories={[
                {
                  icon: instance.instance_data.archived
                    ? { source: "icons/archivebox.svg", tintColor: Color.Yellow }
                    : { source: "icons/tray.svg", tintColor: Color.Blue },
                  tooltip: instance.instance_data.archived ? "Archived" : "Active",
                },
              ]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
