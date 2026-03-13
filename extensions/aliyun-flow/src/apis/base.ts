import { YUNXIAO_HEADERS } from "../constants";

export async function fetchAliyunAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...YUNXIAO_HEADERS,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${response.statusText} (${response.status})`);
  }

  return response.json();
}
