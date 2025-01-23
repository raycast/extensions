import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { mapTemplates } from "../helpers/mappers/templates";
import { Template, PaginatedResponse } from "../helpers/schemas";
import { Pagination } from "../helpers/schemas";

export async function getTemplates(
  spaceId: string,
  typeId: string,
  options: {
    offset: number;
    limit: number;
  },
): Promise<{
  templates: Template[];
  pagination: Pagination;
}> {
  const { url, method } = apiEndpoints.getTemplates(spaceId, typeId, options);
  const response = await apiFetch<PaginatedResponse<Template>>(url, { method: method });

  return {
    templates: response.data ? await mapTemplates(response.data) : [],
    pagination: response.pagination,
  };
}
