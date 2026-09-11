import { getPreferenceValues, LocalStorage } from "@raycast/api";
import {
  CreateItemRequest,
  CreateLabelRequest,
  DetailedItem,
  GroupStatistics,
  Item,
  Label,
  Location,
  MaintenanceLog,
} from "./types";

const { url, username, password } = getPreferenceValues<Preferences>();

export function buildUrl(endpoint: string) {
  return new URL(`api/v1/${endpoint}`, url).toString();
}
function buildHeaders(token = "") {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `${token.replaceAll('"', "")}`,
  };
}
async function parseResponse<T>(response: Response) {
  if (response.status === 204) return undefined as unknown as T;
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error(response.statusText);
  const result = await response.json();
  if (!response.ok) {
    const err = result as { error: string; fields?: { [field: string]: string } };
    if (err.fields) throw new Error(Object.values(err.fields)[0]);
    throw new Error(err.error);
  }
  return result as T;
}
async function login() {
  const response = await fetch(buildUrl("users/login"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
      stayLoggedIn: true,
    }),
  });
  const result = await parseResponse<{ token: string }>(response);
  return result;
}
async function makeRequest<T>(endpoint: string, options?: RequestInit) {
  let token = await LocalStorage.getItem<string>("HOMEBOX-TOKEN");
  if (!token) {
    const loginResult = await login();
    await LocalStorage.setItem("HOMEBOX-TOKEN", loginResult.token);
    token = loginResult.token;
  }
  const response = await fetch(buildUrl(endpoint), {
    ...options,
    headers: buildHeaders(token),
  });
  try {
    const result = await parseResponse<T>(response);
    return result;
  } catch (error) {
    // invalidate the token
    if (token && (error as Error).message === "valid authorization token is required")
      await LocalStorage.removeItem("HOMEBOX-TOKEN");
    throw error;
  }
}
export const homebox = {
  getGroupStatistics: () => makeRequest<GroupStatistics>("groups/statistics"),
  items: {
    create: (body: CreateItemRequest) =>
      makeRequest<Item>("items", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    delete: (id: string) => makeRequest(`items/${id}`, { method: "DELETE" }),
    get: (id: string) => makeRequest<DetailedItem>(`items/${id}`),
    getMaintenanceLog: (id: string) => makeRequest<MaintenanceLog[]>(`items/${id}/maintenance`),
    search: (options: { query: string; page: number }) =>
      makeRequest<{ page: number; pageSize: number; total: number; items: Item[] }>(
        `items?q=${options.query}&page=${options.page}&pageSize=20`,
      ),
  },
  labels: {
    create: (body: CreateLabelRequest) => makeRequest<Label>("labels", { method: "POST", body: JSON.stringify(body) }),
    delete: (id: string) => makeRequest(`labels/${id}`, { method: "DELETE" }),
    list: () => makeRequest<Label[]>("labels"),
  },
  locations: {
    list: () => makeRequest<Location[]>("locations"),
  },
};
