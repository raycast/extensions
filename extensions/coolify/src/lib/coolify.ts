import { API_HEADERS } from "./config";
import { generateCoolifyUrl } from "./utils";

async function makeRequest<T>(endpoint: string, options: RequestInit) {
  const url = generateCoolifyUrl(`api/v1/${endpoint}`);
  const response = await fetch(url, {
    ...options,
    headers: API_HEADERS,
  });
  if (!response.ok) throw new Error(response.statusText);
  const result = await response.json();
  return result as T;
}
export const coolify = {
  projects: {
    delete: (id: string) =>
      makeRequest(`projects/${id}`, {
        method: "DELETE",
      }),
  },
};
