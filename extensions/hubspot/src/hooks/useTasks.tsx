import { useFetch } from "@raycast/utils";
import type { Data } from "@/types/task";
import { useAuthHeaders } from "./useAuthHeaders";

export function useTasks({ search = "", ownerId }: { search?: string; ownerId?: string }) {
  const filters = [
    {
      propertyName: "hs_task_status",
      operator: "NEQ",
      value: "COMPLETED",
    },
  ];

  if (ownerId) {
    filters.push({
      propertyName: "hubspot_owner_id",
      operator: "EQ",
      value: ownerId,
    });
  }

  const associationsParam = encodeURIComponent("contact,company,deal");
  const { isLoading, data, revalidate } = useFetch<Data>(
    `https://api.hubapi.com/crm/v3/objects/tasks/search?associations=${associationsParam}`,
    {
      method: "post",
      headers: useAuthHeaders(),
      body: JSON.stringify({
        query: search,
        limit: 100,
        properties: [
          "hs_task_subject",
          "hs_task_body",
          "hs_task_status",
          "hs_task_priority",
          "hs_timestamp",
          "hs_task_type",
          "hubspot_owner_id",
          "createdate",
        ],
        filterGroups: [
          {
            filters,
          },
        ],
        sorts: [
          {
            propertyName: "hs_timestamp",
            direction: "ASCENDING",
          },
        ],
      }),
      keepPreviousData: true,
    },
  );

  return { isLoading, data, revalidate };
}
