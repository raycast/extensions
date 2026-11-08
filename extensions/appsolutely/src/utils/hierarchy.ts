import type { Folder, LauncherState } from "../models/folder.ts";

export function descendants(folders: Folder[], id: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const folder of folders) {
    if (folder.parentId !== null) {
      children.set(folder.parentId, [...(children.get(folder.parentId) ?? []), folder.id]);
    }
  }
  const result = new Set<string>();
  const pending = [id];
  while (pending.length) {
    const current = pending.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    pending.push(...(children.get(current) ?? []));
  }
  return result;
}

function requireFolder(state: LauncherState, id: string | null): void {
  if (id !== null && !state.folders.some((folder) => folder.id === id)) {
    throw new Error("This folder no longer exists. Choose another folder.");
  }
}

function cleanName(name: string): string {
  const result = name.trim();
  if (!result) throw new Error("Enter a folder name.");
  return result;
}

export function createFolder(state: LauncherState, id: string, name: string, parentId: string | null): LauncherState {
  requireFolder(state, parentId);
  if (state.folders.some((folder) => folder.id === id)) throw new Error("Folder ID already exists.");
  const order = Math.max(-1, ...state.folders.filter((f) => f.parentId === parentId).map((f) => f.order)) + 1;
  return { ...state, folders: [...state.folders, { id, name: cleanName(name), parentId, order }] };
}

export function renameFolder(state: LauncherState, id: string, name: string): LauncherState {
  requireFolder(state, id);
  const nextName = cleanName(name);
  return { ...state, folders: state.folders.map((f) => (f.id === id ? { ...f, name: nextName } : f)) };
}

export function moveFolder(state: LauncherState, id: string, parentId: string | null): LauncherState {
  requireFolder(state, id);
  requireFolder(state, parentId);
  if (parentId !== null && descendants(state.folders, id).has(parentId)) {
    throw new Error("A folder cannot be moved into itself or its subfolders.");
  }
  return { ...state, folders: state.folders.map((f) => (f.id === id ? { ...f, parentId } : f)) };
}

/** Deleting a subtree returns every contained application to the home grid. */
export function deleteFolder(state: LauncherState, id: string): LauncherState {
  requireFolder(state, id);
  const removed = descendants(state.folders, id);
  return {
    ...state,
    folders: state.folders.filter((f) => !removed.has(f.id)),
    assignments: state.assignments.map((a) =>
      a.folderId !== null && removed.has(a.folderId) ? { ...a, folderId: null } : a,
    ),
  };
}

export function folderPath(folders: Folder[], id: string | null): string {
  const lookup = new Map(folders.map((f) => [f.id, f]));
  const names: string[] = [];
  const visited = new Set<string>();
  while (id !== null && !visited.has(id)) {
    visited.add(id);
    const folder = lookup.get(id);
    if (!folder) break;
    names.push(folder.name);
    id = folder.parentId;
  }
  return ["Appsolutely", ...names.reverse()].join(" / ");
}
