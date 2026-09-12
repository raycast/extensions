import type { RoutinesRequest, RoutinesResponse } from "../types";
import { fetchFromHevyAPI } from "./fetch";

export async function getRoutines(request?: RoutinesRequest): Promise<RoutinesResponse> {
  // Set pageSize to 10 (max) if not provided
  const pageSize = request?.pageSize ?? 10;
  const finalPageSize = Math.min(pageSize, 10); // Cap at 10

  const params = new URLSearchParams();
  if (request?.page) {
    params.append("page", request.page.toString());
  }
  params.append("pageSize", finalPageSize.toString());
  if (request?.folder_id) {
    params.append("folder_id", request.folder_id);
  }

  return fetchFromHevyAPI<RoutinesResponse>("/v1/routines", params);
}
