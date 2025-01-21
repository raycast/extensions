import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";

export async function createObject(
  spaceId: string,
  objectData: {
    icon: string;
    name: string;
    description: string;
    body: string;
    source: string;
    template_id: string;
    object_type_unique_key: string;
  },
): Promise<void> {
  const { url, method } = apiEndpoints.createObject(spaceId);

  await apiFetch(url, {
    method: method,
    body: JSON.stringify(objectData),
  });
}
