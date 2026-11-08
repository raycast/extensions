import { emptyState } from "../models/folder.ts";
import type { AppAssignment, Folder, LauncherState } from "../models/folder.ts";

export class UnsupportedSchemaError extends Error {}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const order = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export function decodeState(raw: string | undefined): { state: LauncherState; recovered: boolean } {
  if (raw === undefined) return { state: emptyState(), recovered: false };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { state: emptyState(), recovered: true };
  }
  if (!isObject(data)) return { state: emptyState(), recovered: true };
  // v0/unversioned drafts use the same fields; migrate them explicitly to v1.
  if (data.version !== undefined && data.version !== 0 && data.version !== 1) {
    throw new UnsupportedSchemaError(
      "This layout was saved by a newer Appsolutely version. Update the extension first.",
    );
  }
  const ids = new Set<string>();
  const folders: Folder[] = [];
  for (const value of Array.isArray(data.folders) ? data.folders : []) {
    if (!isObject(value) || typeof value.id !== "string" || !value.id || ids.has(value.id)) continue;
    if (typeof value.name !== "string" || !value.name.trim()) continue;
    ids.add(value.id);
    folders.push({
      id: value.id,
      name: value.name.trim(),
      parentId: typeof value.parentId === "string" ? value.parentId : null,
      order: order(value.order),
    });
  }
  const lookup = new Map(folders.map((f) => [f.id, f]));
  for (const folder of folders) {
    if (folder.parentId !== null && !ids.has(folder.parentId)) folder.parentId = null;
    const visited = new Set([folder.id]);
    let parent = folder.parentId;
    while (parent !== null) {
      if (visited.has(parent)) {
        folder.parentId = null;
        break;
      }
      visited.add(parent);
      parent = lookup.get(parent)?.parentId ?? null;
    }
  }
  // Last assignment wins if an older writer emitted a duplicate.
  const assignments = new Map<string, AppAssignment>();
  for (const value of Array.isArray(data.assignments) ? data.assignments : []) {
    if (!isObject(value) || typeof value.appId !== "string" || !value.appId) continue;
    assignments.set(value.appId, {
      appId: value.appId,
      folderId: typeof value.folderId === "string" && ids.has(value.folderId) ? value.folderId : null,
      order: order(value.order),
      ...(typeof value.appPath === "string" ? { appPath: value.appPath } : {}),
    });
  }
  const state: LauncherState = { version: 1, folders, assignments: [...assignments.values()] };
  return { state, recovered: JSON.stringify(data) !== JSON.stringify(state) };
}

export function encodeState(state: LauncherState): string {
  return JSON.stringify(state);
}
