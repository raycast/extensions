import { environment } from "@raycast/api";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { Collection, EnhancedProject } from "./types";
import { AUTO_COLLECTIONS } from "./types";
import { removeCollectionFromAllProjects } from "./settings";

const COLLECTIONS_FILE = join(environment.supportPath, "collections.json");

function ensureCollectionsDir(): void {
  const dir = dirname(COLLECTIONS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function loadCollections(): Collection[] {
  try {
    if (existsSync(COLLECTIONS_FILE)) {
      const data = readFileSync(COLLECTIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    return [];
  }
  return [];
}

export function saveCollections(collections: Collection[]): void {
  ensureCollectionsDir();
  writeFileSync(COLLECTIONS_FILE, JSON.stringify(collections, null, 2));
}

export function createCollection(
  collection: Omit<Collection, "id">,
): Collection {
  const id = `coll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newCollection: Collection = { ...collection, id };
  const collections = loadCollections();
  collections.push(newCollection);
  saveCollections(collections);
  return newCollection;
}

export function updateCollection(
  id: string,
  updates: Partial<Omit<Collection, "id" | "type">>,
): Collection | null {
  const collections = loadCollections();
  const index = collections.findIndex((c) => c.id === id);
  if (index === -1) return null;
  collections[index] = { ...collections[index], ...updates };
  saveCollections(collections);
  return collections[index];
}

export function deleteCollection(id: string): boolean {
  const collections = loadCollections();
  const filtered = collections.filter((c) => c.id !== id);
  if (filtered.length === collections.length) return false;
  saveCollections(filtered);
  removeCollectionFromAllProjects(id);
  return true;
}

export function getAllCollections(): Collection[] {
  const manual = loadCollections();
  return [...manual, ...AUTO_COLLECTIONS];
}

export function getCollectionById(id: string): Collection | undefined {
  return getAllCollections().find((c) => c.id === id);
}

export function isAutoCollection(id: string): boolean {
  return id.startsWith("_");
}

export function matchesAutoCollection(
  project: EnhancedProject,
  collection: Collection,
): boolean {
  if (collection.type !== "auto" || !collection.criteria) return false;

  const now = Date.now();
  const days = collection.criteria.days || 0;
  const cutoff = now - days * 24 * 60 * 60 * 1000;

  switch (collection.criteria.kind) {
    case "recent":
      return (project.lastOpened || 0) >= cutoff;
    case "stale":
      return project.lastOpened !== undefined && project.lastOpened < cutoff;
    case "git-org":
      return project.gitOrg === collection.criteria.orgName;
    case "uncategorized":
      return !project.collections || project.collections.length === 0;
    default:
      return false;
  }
}
