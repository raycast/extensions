import { getPreferenceValues } from "@raycast/api";
import type { Routine, RoutineSortField, RoutineSortOrder, RoutinesRequest, RoutinesResponse } from "../types";
import { fetchFromHevyAPI } from "./fetch";

type RoutinePreferences = {
  sortRoutinesBy?: RoutineSortField;
  sortRoutinesOrder?: RoutineSortOrder;
};

const DEFAULT_ROUTINE_SORT: RoutineSortField = "title";
const ROUTINE_SORT_FIELDS: RoutineSortField[] = ["title", "created_at"];
const DEFAULT_ROUTINE_ORDER: RoutineSortOrder = "asc";
const ROUTINE_ORDER: RoutineSortOrder[] = ["asc", "desc"];

function sortRoutines(routines: Routine[], sortField: RoutineSortField, sortOrder: RoutineSortOrder): Routine[] {
  return [...routines].sort((left, right) => {
    if (sortField === "title") {
      return sortOrder === "asc" ? left.title.localeCompare(right.title) : right.title.localeCompare(left.title);
    }

    return sortOrder === "asc"
      ? new Date(right[sortField]).getTime() - new Date(left[sortField]).getTime()
      : new Date(left[sortField]).getTime() - new Date(right[sortField]).getTime();
  });
}

export async function getRoutines(request?: RoutinesRequest): Promise<RoutinesResponse> {
  // Set pageSize to 10 (max) if not provided
  const pageSize = request?.pageSize ?? 10;
  const finalPageSize = Math.min(pageSize, 10); // Cap at 10
  const { sortRoutinesBy = DEFAULT_ROUTINE_SORT, sortRoutinesOrder = DEFAULT_ROUTINE_ORDER } =
    getPreferenceValues<RoutinePreferences>();
  const sortField = ROUTINE_SORT_FIELDS.includes(sortRoutinesBy) ? sortRoutinesBy : DEFAULT_ROUTINE_SORT;
  const sortOrder = ROUTINE_ORDER.includes(sortRoutinesOrder) ? sortRoutinesOrder : DEFAULT_ROUTINE_ORDER;

  const params = new URLSearchParams();
  if (request?.page) {
    params.append("page", request.page.toString());
  }
  params.append("pageSize", finalPageSize.toString());
  if (request?.folder_id) {
    params.append("folder_id", request.folder_id);
  }

  const response = await fetchFromHevyAPI<RoutinesResponse>("/v1/routines", params);

  return {
    ...response,
    routines: sortRoutines(response.routines, sortField, sortOrder),
  };
}
