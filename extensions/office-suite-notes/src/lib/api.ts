import { getPreferenceValues } from "@raycast/api";
import { Connection, createClient, Folder, itemId, Note, positiveInt, query } from "./api-core";

function client() {
  return createClient(getPreferenceValues<Connection>());
}
export function listNotes(page = 1, folder?: string) {
  return client()<Note[]>(`/notes?${query({ page: positiveInt(page, 100000), limit: 50, folder })}`);
}
export function searchNotes(search: string, folder?: string, limit = 100) {
  if (!search.trim()) throw new Error("Search text is required.");
  return client()<Note[]>(`/notes/search?${query({ query: search.trim(), folder, limit: positiveInt(limit) })}`);
}
export function readNote(id: string) {
  return client()<Note>(`/notes/${itemId(id)}`);
}
export function listFolders(parent?: string) {
  return client()<Folder[]>(`/folders?${query({ parent })}`);
}
export function createNote(title: string, content: string, folder?: string) {
  if (!title.trim() || !content.trim()) throw new Error("A title and content are required.");
  return client()<Note>("/notes", {
    method: "POST",
    body: { title: title.trim(), content, ...(folder ? { folder } : {}) },
  });
}
export function appendNote(id: string, content: string) {
  if (!content.trim()) throw new Error("Content is required.");
  return client()<Note>(`/notes/${itemId(id)}`, { method: "PUT", body: { content } });
}
export async function checkConnection() {
  await client()<unknown>("/version", { health: true });
  return client()<{ appVersion?: string; apiVersion?: string }>("/version");
}
