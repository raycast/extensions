import { DisplayCodeResponse } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function displayCode(appName: string): Promise<DisplayCodeResponse> {
  const { url, method } = apiEndpoints.displayCode(appName);
  const response = await apiFetch<DisplayCodeResponse>(url, { method: method });
  return response.payload;
}
