import { mapProperty } from "../../mappers/properties";
import { CreatePropertyRequest, Property, RawProperty } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createProperty(spaceId: string, request: CreatePropertyRequest): Promise<{ property: Property }> {
  const { url, method } = apiEndpoints.createProperty(spaceId);

  const response = await apiFetch<{ property: RawProperty }>(url, {
    method: method,
    body: JSON.stringify(request),
  });

  return { property: mapProperty(response.payload.property) };
}
