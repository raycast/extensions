import { getPreferenceValues } from "@raycast/api";
import { request, type Collection } from "./client";
export function api<T>(
  path: string,
  options: { body?: unknown; signal?: AbortSignal } = {},
) {
  return request<T>(getPreferenceValues<Preferences>().apiKey, path, options);
}
export async function getCollections() {
  return (await api<{ collections: Collection[] }>("/collections")).collections;
}
