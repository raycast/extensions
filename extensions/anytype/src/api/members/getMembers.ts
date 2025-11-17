import { mapMembers } from "../../mappers/members";
import { Member, PaginatedResponse, Pagination, RawMember } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getMembers(
  spaceId: string,
  options: { offset: number; limit: number },
): Promise<{
  members: Member[];
  pagination: Pagination;
}> {
  const { url, method } = apiEndpoints.getMembers(spaceId, options);
  const response = await apiFetch<PaginatedResponse<RawMember>>(url, { method: method });

  return {
    members: response.payload.data ? await mapMembers(response.payload.data) : [],
    pagination: response.payload.pagination,
  };
}
