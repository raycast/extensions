import { useFetch } from "@raycast/utils";
import { baseApiUrl, preparedPersonalAccessToken } from "../preferences";
import { WorkItemDetailsResponse, WorkItemResponse } from "../models/task";

export const fetchWorkItems = (projectName: string) => {
  const {
    data: taskData,
    isLoading: isLoadingIds,
    error: idsError,
  } = useFetch<WorkItemResponse>(`${baseApiUrl()}/${projectName}/_apis/wit/wiql?api-version=7.2-preview.2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${preparedPersonalAccessToken()}`,
    },
    body: JSON.stringify({
      query:
        "Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.TeamProject] = @project AND [System.AssignedTo] = @Me",
    }),
  });

  const workItemIds = taskData?.workItems.map((item: { id: number }) => item.id).join(",") || "";
  const detailsUrl =
    workItemIds.length > 0
      ? `${baseApiUrl()}/${projectName}/_apis/wit/workitems?ids=${workItemIds}&$expand=all&api-version=7.2-preview.2`
      : null;

  const {
    data: workItemDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useFetch<WorkItemDetailsResponse>(detailsUrl || "", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${preparedPersonalAccessToken()}`,
    },
    execute: !!detailsUrl,
  });

  const isLoading = isLoadingIds || isLoadingDetails;
  const error = idsError || detailsError;

  return { data: workItemDetails, isLoading, error };
};
