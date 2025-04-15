import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { TokenResponse } from "../helpers/schemas";

export async function getToken(challengeId: string, code: string): Promise<TokenResponse> {
  const { url, method } = apiEndpoints.getToken(challengeId, code);
  return await apiFetch<TokenResponse>(url, { method: method });
}
