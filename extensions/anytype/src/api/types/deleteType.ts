import { mapType } from "../../mappers/types";
import { RawType, Type } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function deleteType(spaceId: string, typeId: string): Promise<Type> {
  const { url, method } = apiEndpoints.deleteType(spaceId, typeId);

  const response = await apiFetch<{ type: RawType }>(url, {
    method: method,
  });

  return mapType(response.payload.type);
}
