import { mapType } from "../../mappers/types";
import { CreateTypeRequest, RawType, Type } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createType(spaceId: string, request: CreateTypeRequest): Promise<{ type: Type | null }> {
  const { url, method } = apiEndpoints.createType(spaceId);

  const response = await apiFetch<{ type: RawType }>(url, {
    method: method,
    body: JSON.stringify(request),
  });

  return {
    type: response ? await mapType(response.payload.type) : null,
  };
}
