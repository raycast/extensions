import { PaginatedResponse, Pagination, View } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getListViews(
  spaceId: string,
  listId: string,
  options: { offset: number; limit: number },
): Promise<{
  views: View[];
  pagination: Pagination;
}> {
  const { url, method } = apiEndpoints.getListViews(spaceId, listId, options);
  const response = await apiFetch<PaginatedResponse<View>>(url, { method: method });

  return {
    views: response.payload.data,
    pagination: response.payload.pagination,
  };
}
