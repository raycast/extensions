import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { EntityDataResponse, FilterOperator, Instance, Preferences } from "../types";
import { createFilter, getAdjustedFieldDataName } from "../utils/entities";

/**
 * Hook for fetching entity data filtered by a specific field
 *
 * @param entityDataName The name of the entity data to fetch
 * @param fieldDataName The field_data_name to filter by
 * @param fieldTypeName The field type name
 * @param filterOperator The operator to use for filtering ("like", "in", or "=")
 * @param filterValue The value to filter by
 * @param pageSize The number of items to fetch per page (default: 25)
 * @param showArchived Whether to include archived items in the results (default: false)
 */
export function useFilteredEntityData(
  entityDataName: string,
  fieldDataName: string | null,
  fieldTypeName: string | null,
  filterOperator: FilterOperator | null,
  filterValue: string | string[] | number | null,
  pageSize: number = 25,
  showArchived: boolean = false,
) {
  const preferences = getPreferenceValues<Preferences>();
  const [page, setPage] = useState(0);
  const [allData, setAllData] = useState<Instance[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Reset state when key parameters change
  useEffect(() => {
    setPage(0);
    setAllData([]);
    setHasMore(true);
  }, [entityDataName, fieldDataName, filterOperator, filterValue, pageSize, showArchived]);

  // Get adjusted field data name for ordering
  const adjustedFieldDataName = getAdjustedFieldDataName(fieldDataName, fieldTypeName);

  // Create filter based on field type, operator, and value
  const filter = createFilter(fieldDataName, fieldTypeName, filterOperator, filterValue);

  const shouldExecute =
    !!entityDataName && !!fieldDataName && !!filterOperator && filterValue !== null && filterValue !== "";

  const { data, isLoading, error, revalidate } = useFetch<EntityDataResponse>(
    `https://${preferences.organization}.origami.ms/entities/api/instance_data/format/json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: preferences.email,
        api_secret: preferences["api-token"],
        type: 2,
        entity_data_name: entityDataName,
        orderby: [adjustedFieldDataName || fieldDataName, "asc"],
        limit: [page * pageSize, pageSize],
        with_archive: showArchived ? 1 : 0,
        ui_data: 1,
        filter,
      }),
      execute: shouldExecute,
      keepPreviousData: true,
    },
  );

  // Update the accumulated data when new data arrives
  useEffect(() => {
    if (!data?.data) return;

    // Ensure data.data is an array and cast to Instance[]
    const dataArray: Instance[] = Array.isArray(data.data) ? data.data : (Object.values(data.data) as Instance[]);

    if (page === 0) {
      setAllData(dataArray);
    } else {
      // For pagination, merge avoiding duplicates
      const newData = dataArray.filter(
        (item) => !allData.some((existingItem) => existingItem.instance_data._id === item.instance_data._id),
      );

      if (newData.length > 0) {
        setAllData((prevData) => [...prevData, ...newData]);
      }
    }

    setHasMore(dataArray.length === pageSize);
  }, [data, page, pageSize]);

  // Create pagination object for the List component
  const pagination = {
    onLoadMore: () => {
      if (hasMore && !isLoading) {
        setPage((prev) => prev + 1);
      }
    },
    hasMore,
    pageSize,
  };

  // Create the combined data object
  const combinedData: EntityDataResponse = data
    ? { ...data, data: allData }
    : {
        info: {
          total_count: 0,
          current_page_total_count: 0,
          max_each_page: pageSize,
          current_page_number: 0,
          total_pages: 0,
        },
        entity_data: {
          entity_name: "",
          entity_data_name: "",
          entity_id: "",
        },
        data: [],
      };

  return {
    data: combinedData,
    isLoading,
    error,
    pagination,
    revalidate,
  };
}
