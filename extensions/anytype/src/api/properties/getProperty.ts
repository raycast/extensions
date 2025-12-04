import { mapProperty } from "../../mappers/properties";
import { Property, RawProperty } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getProperty(spaceId: string, propertyId: string): Promise<{ property: Property }> {
  const { url, method } = apiEndpoints.getProperty(spaceId, propertyId);
  const response = await apiFetch<{ property: RawProperty }>(url, { method: method });
  return {
    property: mapProperty(response.payload.property),
  };
}
