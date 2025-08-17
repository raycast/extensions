import { mapProperty } from "../../mappers/properties";
import { Property, RawProperty } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function deleteProperty(spaceId: string, propertyId: string): Promise<Property> {
  const { url, method } = apiEndpoints.deleteProperty(spaceId, propertyId);

  const response = await apiFetch<{ property: RawProperty }>(url, {
    method: method,
  });

  return mapProperty(response.payload.property);
}
