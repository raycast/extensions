import { LocalStorage } from "@raycast/api";
import type { TeamFiles } from "./types";
import { PROJECT_FILES_CONFIG } from "./lib/fileStorage";

// Project-level TTL configuration
const PROJECT_TTL_MINUTES = 30;
const PROJECT_TTL_CACHE_KEY = "PROJECT_TTLS";

// Structure for project TTL data
interface ProjectTTLData {
  [projectId: string]: {
    lastFetched: number;
    expiresAt: number;
  };
}

const PAGES_CACHE_KEY = "PAGES";

// Project TTL utility functions
async function loadProjectTTLs(): Promise<ProjectTTLData> {
  const item = await LocalStorage.getItem<string>(PROJECT_TTL_CACHE_KEY);
  if (item) {
    try {
      return JSON.parse(item) as ProjectTTLData;
    } catch {
      return {};
    }
  }
  return {};
}

async function saveProjectTTLs(ttlData: ProjectTTLData): Promise<void> {
  const data = JSON.stringify(ttlData);
  await LocalStorage.setItem(PROJECT_TTL_CACHE_KEY, data);
}

function isProjectTTLExpired(projectId: string, ttlData: ProjectTTLData): boolean {
  const projectTTL = ttlData[projectId];
  if (!projectTTL) return true; // No TTL data means project needs fetching
  return Date.now() > projectTTL.expiresAt;
}

function updateProjectTTL(projectId: string, ttlData: ProjectTTLData): void {
  const now = Date.now();
  ttlData[projectId] = {
    lastFetched: now,
    expiresAt: now + PROJECT_TTL_MINUTES * 60 * 1000,
  };
}

export async function getProjectsNeedingRefresh(projectIds: string[]): Promise<string[]> {
  const ttlData = await loadProjectTTLs();
  return projectIds.filter((projectId) => isProjectTTLExpired(projectId, ttlData));
}

export async function updateProjectTTLs(projectIds: string[]): Promise<void> {
  const ttlData = await loadProjectTTLs();
  projectIds.forEach((projectId) => updateProjectTTL(projectId, ttlData));
  await saveProjectTTLs(ttlData);
}

export async function storeFiles(teamFiles: TeamFiles[]): Promise<void> {
  const data = JSON.stringify(teamFiles);
  await LocalStorage.setItem(PROJECT_FILES_CONFIG.storageKey, data);
}

export async function loadFiles(): Promise<TeamFiles[] | undefined> {
  const item = await LocalStorage.getItem<string>(PROJECT_FILES_CONFIG.storageKey);
  if (item) {
    try {
      const parsed = JSON.parse(item) as TeamFiles[];
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

async function clearPagesCache() {
  try {
    const items = await LocalStorage.allItems();
    // Find and remove all items that start with PAGES_CACHE_KEY-
    const promises = Object.keys(items)
      .filter((key) => key.startsWith(`${PAGES_CACHE_KEY}-`))
      .map((key) => LocalStorage.removeItem(key));
    await Promise.all(promises);
  } catch (error) {
    console.error("Error clearing pages cache:", error);
  }
}

export async function clearFiles(): Promise<void> {
  await LocalStorage.removeItem(PROJECT_FILES_CONFIG.storageKey);
  await clearPagesCache();
}
