import { AddObjectsToListRequest } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";
import { ApiResponse } from "../../utils/api";

export async function addObjectsToList(
  spaceId: string,
  listId: string,
  request: AddObjectsToListRequest,
): Promise<ApiResponse<string>> {
  const { url, method } = apiEndpoints.addObjectsToList(spaceId, listId);

  return await apiFetch<string>(url, {
    method: method,
    body: JSON.stringify(request),
  });
}
