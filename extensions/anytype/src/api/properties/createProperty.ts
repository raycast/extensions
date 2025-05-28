import { mapProperty } from "../../mappers/properties";
import { CreatePropertyRequest, Property, RawProperty } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createProperty(
  spaceId: string,
  propertyData: CreatePropertyRequest,
): Promise<{ property: Property | null }> {
  const { url, method } = apiEndpoints.createProperty(spaceId);

  const response = await apiFetch<{ property: RawProperty }>(url, {
    method: method,
    body: JSON.stringify(propertyData),
  });

  return {
    property: response ? mapProperty(response.payload.property) : null,
  };
}
