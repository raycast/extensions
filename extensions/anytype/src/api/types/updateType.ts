import { mapType } from "../../mappers/types";
import { RawType, Type, UpdateTypeRequest } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function updateType(spaceId: string, typeId: string, data: UpdateTypeRequest): Promise<{ type: Type }> {
  const { url, method } = apiEndpoints.updateType(spaceId, typeId);

  const response = await apiFetch<{ type: RawType }>(url, {
    method: method,
    body: JSON.stringify(data),
  });

  return { type: await mapType(response.payload.type) };
}
