import { mapType } from "../../mappers/types";
import { CreateTypeRequest, RawType, Type } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createType(spaceId: string, typeData: CreateTypeRequest): Promise<{ type: Type | null }> {
  const { url, method } = apiEndpoints.createType(spaceId);

  const response = await apiFetch<{ type: RawType }>(url, {
    method: method,
    body: JSON.stringify(typeData),
  });

  return {
    type: response ? await mapType(response.payload.type) : null,
  };
}
