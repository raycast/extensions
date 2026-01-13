import { LocalStorage } from "@raycast/api";
import { GcpResource } from "./types";
import { GCP_RESOURCES } from "./resources";
import { PROJECT_KEYWORDS } from "./project-keywords";

const CUSTOM_RESOURCES_KEY = "gcpCustomResources";
const CUSTOM_KEYWORDS_KEY = "gcpCustomKeywords";

export async function getCustomResources(): Promise<GcpResource[]> {
  const data = await LocalStorage.getItem<string>(CUSTOM_RESOURCES_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveCustomResource(resource: GcpResource): Promise<void> {
  const existing = await getCustomResources();
  const filtered = existing.filter((r) => r.id !== resource.id);
  await LocalStorage.setItem(
    CUSTOM_RESOURCES_KEY,
    JSON.stringify([...filtered, resource]),
  );
}

export async function deleteCustomResource(id: string): Promise<void> {
  const existing = await getCustomResources();
  const filtered = existing.filter((r) => r.id !== id);
  await LocalStorage.setItem(CUSTOM_RESOURCES_KEY, JSON.stringify(filtered));
}

export async function getMergedResources(): Promise<GcpResource[]> {
  const custom = await getCustomResources();
  const merged = new Map(GCP_RESOURCES.map((r) => [r.id, r]));
  custom.forEach((r) => merged.set(r.id, r));
  return [...merged.values()];
}

export async function getCustomKeywords(): Promise<Record<string, string[]>> {
  const data = await LocalStorage.getItem<string>(CUSTOM_KEYWORDS_KEY);
  return data ? JSON.parse(data) : {};
}

export async function saveProjectKeywords(
  projectId: string,
  keywords: string[],
): Promise<void> {
  const existing = await getCustomKeywords();
  existing[projectId] = keywords;
  await LocalStorage.setItem(CUSTOM_KEYWORDS_KEY, JSON.stringify(existing));
}

export async function deleteProjectKeywords(projectId: string): Promise<void> {
  const existing = await getCustomKeywords();
  delete existing[projectId];
  await LocalStorage.setItem(CUSTOM_KEYWORDS_KEY, JSON.stringify(existing));
}

export async function getMergedKeywords(): Promise<Record<string, string[]>> {
  const custom = await getCustomKeywords();
  return { ...PROJECT_KEYWORDS, ...custom };
}
