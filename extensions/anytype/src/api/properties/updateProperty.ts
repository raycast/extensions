import { mapProperty } from "../../mappers/properties";
import { Property, RawProperty, UpdatePropertyRequest } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function updateProperty(
  spaceId: string,
  propertyId: string,
  request: UpdatePropertyRequest,
): Promise<{ property: Property }> {
  const { url, method } = apiEndpoints.updateProperty(spaceId, propertyId);

  const response = await apiFetch<{ property: RawProperty }>(url, {
    method: method,
    body: JSON.stringify(request),
  });

  return { property: mapProperty(response.payload.property) };
}
