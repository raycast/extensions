import type { WorkoutsRequest, WorkoutsResponse } from "../types";
import { fetchFromHevyAPI } from "./fetch";

export async function getWorkouts(request?: WorkoutsRequest): Promise<WorkoutsResponse> {
  // Set pageSize to 10 (max) if not provided
  const pageSize = request?.pageSize ?? 10;
  const finalPageSize = Math.min(pageSize, 10); // Cap at 10

  const params = new URLSearchParams();
  if (request?.page) {
    params.append("page", request.page.toString());
  }
  params.append("pageSize", finalPageSize.toString());
  if (request?.startDate) {
    params.append("startDate", request.startDate);
  }
  if (request?.endDate) {
    params.append("endDate", request.endDate);
  }

  return fetchFromHevyAPI<WorkoutsResponse>("/v1/workouts", params);
}
