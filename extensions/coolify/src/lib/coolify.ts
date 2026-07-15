import { API_HEADERS } from "./config";
import { MessageResult } from "./types";
import { generateCoolifyUrl, parseCoolifyResponse } from "./utils";

async function makeRequest<T>(endpoint: string, options: RequestInit) {
  const url = generateCoolifyUrl(`api/v1/${endpoint}`);
  const response = await fetch(url, {
    ...options,
    headers: API_HEADERS,
  });
  const result = await parseCoolifyResponse<T>(response);
  return result;
}
export const coolify = {
  projects: {
    delete: (id: string) =>
      makeRequest<MessageResult>(`projects/${id}`, {
        method: "DELETE",
      }),
  },
};
