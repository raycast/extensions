import { CreateSpaceRequest } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createSpace(request: CreateSpaceRequest): Promise<void> {
  const { url, method } = apiEndpoints.createSpace;

  await apiFetch(url, {
    method: method,
    body: JSON.stringify(request),
  });
}
