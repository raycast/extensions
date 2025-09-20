import { useFetch } from "@raycast/utils";

export function useFetchWmill<T>(url: string, token: string, options: RequestInit = {}) {
  return useFetch<T>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...options,
  });
}
