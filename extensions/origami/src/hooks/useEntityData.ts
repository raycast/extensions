import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { EntityDataResponse, Instance, Preferences } from "../types";

/**
 * Hook for fetching entity data with pagination support
 *
 * @param entityDataName The name of the entity data to fetch
 * @param pageSize The number of items to fetch per page (default: 25)
 * @param showArchived Whether to include archived items in the results (default: false)
 */
export function useEntityData(entityDataName: string, pageSize: number = 25, showArchived: boolean = false) {
  const preferences = getPreferenceValues<Preferences>();
  const [page, setPage] = useState(0);
  const [allData, setAllData] = useState<Instance[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Reset state when key parameters change
  useEffect(() => {
    setPage(0);
    setAllData([]);
    setHasMore(true);
  }, [entityDataName, pageSize, showArchived]);

  const { data, isLoading, error, revalidate } = useFetch<EntityDataResponse>(
    entityDataName ? `https://${preferences.organization}.origami.ms/entities/api/instance_data/format/json` : "",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: preferences.email,
        api_secret: preferences["api-token"],
        entity_data_name: entityDataName,
        type: 2,
        limit: [page * pageSize, pageSize],
        with_archive: showArchived ? 1 : 0,
        ui_data: 1,
      }),
      execute: !!entityDataName,
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
    setCustomPageSize: () => setPage(0),
    revalidate,
  };
}
