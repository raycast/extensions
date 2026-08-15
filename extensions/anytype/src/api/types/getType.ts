import { mapType } from "../../mappers/types";
import { RawType, Type } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getType(spaceId: string, typeId: string): Promise<{ type: Type }> {
  const { url, method } = apiEndpoints.getType(spaceId, typeId);
  const response = await apiFetch<{ type: RawType }>(url, { method: method });
  return { type: await mapType(response.payload.type) };
}

export async function getRawType(spaceId: string, typeId: string): Promise<{ type: RawType }> {
  const { url, method } = apiEndpoints.getType(spaceId, typeId);
  const response = await apiFetch<{ type: RawType }>(url, { method: method });
  return { type: response.payload.type };
}
