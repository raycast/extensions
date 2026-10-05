import { CreateApiKeyRequest, CreateApiKeyResponse } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createApiKey(request: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
  const { url, method } = apiEndpoints.createApiKey();

  const response = await apiFetch<CreateApiKeyResponse>(url, {
    method: method,
    body: JSON.stringify(request),
  });

  return response.payload;
}
