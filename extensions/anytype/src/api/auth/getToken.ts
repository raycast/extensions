import { TokenResponse } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getToken(challengeId: string, code: string): Promise<TokenResponse> {
  const { url, method } = apiEndpoints.getToken(challengeId, code);
  const response = await apiFetch<TokenResponse>(url, { method: method });
  return response.payload;
}
