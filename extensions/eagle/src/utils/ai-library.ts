import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { EagleClient, EagleFolder, EagleItem, ItemChanges } from "../@types/eagle-v2";
import { eagleV2 } from "./api";

export type FolderInfo = { id: string; name: string; path: string };
export type LibraryInfo = { id: string; name: string; path: string; folders: FolderInfo[] };

export function text(value: unknown, field: string, allowEmpty = false): asserts value is string {
  if (typeof value !== "string" || value.includes("\0") || (!allowEmpty && !value.trim())) {
    throw new Error(`${field} must be ${allowEmpty ? "a string" : "a non-empty string"}.`);
  }
}

export function identifier(value: unknown, field: string): asserts value is string {
  text(value, field);
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error(`${field} is not a valid Eagle identifier.`);
}

export function strings(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be an array of strings.`);
  for (const entry of value) text(entry, field);
  return [...new Set(value as string[])];
}

export function rating(value: unknown) {
  if (value !== undefined && (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 5)) {
    throw new Error("rating must be a user-supplied integer from 0 to 5.");
  }
}

export function sourceUrl(value: unknown, allowEmpty = false): asserts value is string {
  text(value, "sourceUrl", allowEmpty);
  if (value === "" && allowEmpty) return;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("sourceUrl must be an HTTP(S) URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("sourceUrl must be an HTTP(S) URL without credentials.");
  }
}

function flattenFolders(folders: EagleFolder[], parent = "", seen = new Set<string>()): FolderInfo[] {
  return folders.flatMap((folder) => {
    identifier(folder.id, "folder ID");
    text(folder.name, "folder name");
    if (seen.has(folder.id)) throw new Error("Eagle returned a repeated folder ID. Read the library again.");
    seen.add(folder.id);
    const path = parent ? `${parent}/${folder.name}` : folder.name;
    return [{ id: folder.id, name: folder.name, path }, ...flattenFolders(folder.children || [], path, seen)];
  });
}

export async function activeLibrary(client: EagleClient = eagleV2): Promise<LibraryInfo> {
  const library = await client.library();
  text(library.name, "library name");
  text(library.path, "library path");
  if (!isAbsolute(library.path) || !Array.isArray(library.folders)) {
    throw new Error("Eagle returned an unsupported library response. AI tools require Eagle 4.0 Build 21 or later.");
  }
  const path = await realpath(library.path);
  return {
    id: createHash("sha256").update(path).digest("hex"),
    name: library.name,
    path,
    folders: flattenFolders(library.folders),
  };
}

export async function requireLibrary(libraryId: string, client: EagleClient = eagleV2) {
  text(libraryId, "libraryId");
  const library = await activeLibrary(client);
  if (library.id !== libraryId) {
    throw new Error(
      "The active Eagle library changed. Use get-library and confirm the intended library before trying again.",
    );
  }
  return library;
}

export function resolveFolders(ids: string[], library: LibraryInfo) {
  return ids.map((id) => {
    identifier(id, "folder ID");
    const folder = library.folders.find((entry) => entry.id === id);
    if (!folder) throw new Error(`Folder ${id} does not exist in ${library.name}. Use get-library again.`);
    return folder;
  });
}

export function itemDetails(item: EagleItem, library: LibraryInfo) {
  return {
    id: item.id,
    name: item.name,
    extension: item.ext,
    size: item.size,
    width: item.width,
    height: item.height,
    sourceUrl: item.url || "",
    notes: item.annotation || "",
    tags: item.tags || [],
    folders: (item.folders || []).map((id) => ({
      id,
      path: library.folders.find((folder) => folder.id === id)?.path || "Unknown folder",
    })),
    rating: item.star ?? 0,
    isDeleted: item.isDeleted ?? false,
    modificationTime: item.modificationTime,
    link: `eagle://item/${encodeURIComponent(item.id)}`,
  };
}

export async function exactItem(id: string, client: EagleClient = eagleV2) {
  identifier(id, "itemId");
  // Eagle's singular `id` lookup can expose provisional duplicate imports. The
  // documented `ids` filter reads the accepted library collection instead.
  const page = await client.items({ ids: [id], limit: 1 });
  return page.data.find((item) => item.id === id);
}

export type UpdateInput = {
  libraryId: string;
  itemId: string;
  name?: string;
  sourceUrl?: string;
  notes?: string;
  rating?: number;
  tagsToAdd?: string[];
  folderIdsToAdd?: string[];
};

export function validateUpdate(input: UpdateInput) {
  identifier(input.itemId, "itemId");
  text(input.libraryId, "libraryId");
  if (input.name !== undefined) {
    text(input.name, "name");
    if (/[\\/]/.test(input.name) || input.name === "." || input.name === "..") {
      throw new Error("name must be a file name without path separators.");
    }
  }
  if (input.sourceUrl !== undefined) sourceUrl(input.sourceUrl, true);
  if (input.notes !== undefined) text(input.notes, "notes", true);
  rating(input.rating);
  strings(input.tagsToAdd, "tagsToAdd");
  strings(input.folderIdsToAdd, "folderIdsToAdd").forEach((id) => identifier(id, "folder ID"));
  if (
    input.name === undefined &&
    input.sourceUrl === undefined &&
    input.notes === undefined &&
    input.rating === undefined &&
    !input.tagsToAdd?.length &&
    !input.folderIdsToAdd?.length
  )
    throw new Error("Specify at least one field to update.");
}

export function mergeChanges(input: UpdateInput, item: EagleItem): ItemChanges {
  const changes: ItemChanges = {};
  if (input.name !== undefined && input.name !== item.name) changes.name = input.name;
  if (input.sourceUrl !== undefined && input.sourceUrl !== (item.url || "")) changes.url = input.sourceUrl;
  if (input.notes !== undefined && input.notes !== (item.annotation || "")) changes.annotation = input.notes;
  if (input.rating !== undefined && input.rating !== (item.star ?? 0)) changes.star = input.rating;
  const tags = [...new Set([...(item.tags || []), ...strings(input.tagsToAdd, "tagsToAdd")])];
  const folders = [...new Set([...(item.folders || []), ...strings(input.folderIdsToAdd, "folderIdsToAdd")])];
  if (tags.length !== (item.tags || []).length) changes.tags = tags;
  if (folders.length !== (item.folders || []).length) changes.folders = folders;
  return changes;
}

export async function prepareUpdate(input: UpdateInput, client: EagleClient = eagleV2) {
  validateUpdate(input);
  const library = await requireLibrary(input.libraryId, client);
  const folders = resolveFolders(strings(input.folderIdsToAdd, "folderIdsToAdd"), library);
  const item = await exactItem(input.itemId, client);
  if (!item || item.isDeleted)
    throw new Error("The item is missing or in Eagle's trash. Find the intended item again.");
  return { library, folders, item };
}

export async function updateItemMetadata(input: UpdateInput, client: EagleClient = eagleV2) {
  const { library } = await prepareUpdate(input, client);
  // Read again after validation so additive fields use the latest memberships.
  const latest = await exactItem(input.itemId, client);
  if (!latest || latest.isDeleted) throw new Error("The item is missing or in Eagle's trash.");
  const changes = mergeChanges(input, latest);
  const current = await requireLibrary(input.libraryId, client);
  resolveFolders(strings(input.folderIdsToAdd, "folderIdsToAdd"), current);
  let requestError: unknown;
  if (Object.keys(changes).length) {
    try {
      await client.update(input.itemId, changes);
    } catch (error) {
      requestError = error;
    }
  }
  try {
    await requireLibrary(input.libraryId, client);
    const result = await exactItem(input.itemId, client);
    const verified =
      result &&
      !result.isDeleted &&
      Object.entries(changes).every(([key, value]) => {
        const actual = result[key as keyof ItemChanges];
        return Array.isArray(value)
          ? value.every((entry) => Array.isArray(actual) && actual.includes(entry))
          : actual === value;
      });
    if (verified) return { status: "updated", libraryId: library.id, item: itemDetails(result, current) };
  } catch {
    // A failed read after a write cannot establish whether the mutation succeeded.
  }
  return {
    status: "uncertain",
    itemId: input.itemId,
    link: `eagle://item/${input.itemId}`,
    message:
      "The requested changes could not be verified. Read the item in the intended library before trying another update.",
    requestFailed: requestError !== undefined,
  };
}
