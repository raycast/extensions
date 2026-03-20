import { LocalStorage } from "@raycast/api";
import { FolderNode } from "./types";

const FOLDERS_KEY = "folder-tree";
const RECENTS_KEY = "recent-folders";
const PINS_KEY = "pinned-folders";
const MAX_RECENTS = 5;

// --- Folder Tree ---

export async function loadFolders(): Promise<FolderNode[]> {
  const stored = await LocalStorage.getItem<string>(FOLDERS_KEY);
  if (!stored) return [];
  return JSON.parse(stored) as FolderNode[];
}

export async function saveFolders(folders: FolderNode[]): Promise<void> {
  await LocalStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

// --- Recents ---

export async function loadRecents(): Promise<FolderNode[]> {
  const stored = await LocalStorage.getItem<string>(RECENTS_KEY);
  if (!stored) return [];
  return JSON.parse(stored) as FolderNode[];
}

export async function addToRecents(folder: FolderNode): Promise<void> {
  const existing = await loadRecents();
  const updated = [folder, ...existing.filter((f) => f.id !== folder.id)].slice(0, MAX_RECENTS);
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
}

// --- Pins ---

export async function loadPins(): Promise<FolderNode[]> {
  const stored = await LocalStorage.getItem<string>(PINS_KEY);
  if (!stored) return [];
  return JSON.parse(stored) as FolderNode[];
}

export async function addToPins(folder: FolderNode): Promise<void> {
  const existing = await loadPins();
  if (existing.find((f) => f.id === folder.id)) return;
  await LocalStorage.setItem(PINS_KEY, JSON.stringify([...existing, folder]));
}

export async function removeFromPins(folderId: string): Promise<void> {
  const existing = await loadPins();
  await LocalStorage.setItem(PINS_KEY, JSON.stringify(existing.filter((f) => f.id !== folderId)));
}

// --- Tree Helpers (shared between browse and manage) ---

export function getAllFolders(nodes: FolderNode[], excludeId?: string): FolderNode[] {
  const result: FolderNode[] = [];
  function walk(list: FolderNode[]) {
    for (const node of list) {
      if (node.id !== excludeId) {
        result.push(node);
        if (node.children) walk(node.children);
      }
    }
  }
  walk(nodes);
  return result;
}

export function updateNode(nodes: FolderNode[], id: string, updated: FolderNode): FolderNode[] {
  return nodes.map((n) => {
    if (n.id === id) return updated;
    if (n.children) return { ...n, children: updateNode(n.children, id, updated) };
    return n;
  });
}

export function deleteNode(nodes: FolderNode[], id: string): FolderNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      children: n.children ? deleteNode(n.children, id) : undefined,
    }));
}

export function addChildNode(nodes: FolderNode[], parentId: string, child: FolderNode): FolderNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...(n.children ?? []), child] };
    }
    if (n.children) return { ...n, children: addChildNode(n.children, parentId, child) };
    return n;
  });
}

export function findFolderPath(nodes: FolderNode[], targetId: string, current = ""): string | null {
  for (const node of nodes) {
    const path = current ? `${current} / ${node.name}` : node.name;
    if (node.id === targetId) return path;
    if (node.children) {
      const found = findFolderPath(node.children, targetId, path);
      if (found) return found;
    }
  }
  return null;
}

export async function cleanupStaleEntries(liveFolders: FolderNode[]): Promise<void> {
  const all = getAllFolders(liveFolders);
  const liveIds = new Set(all.map((f) => f.id));

  const pins = await loadPins();
  const cleanPins = pins.filter((f) => liveIds.has(f.id));
  await LocalStorage.setItem(PINS_KEY, JSON.stringify(cleanPins));

  const recents = await loadRecents();
  const cleanRecents = recents.filter((f) => liveIds.has(f.id));
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(cleanRecents));
}

export async function clearRecents(): Promise<void> {
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify([]));
}
