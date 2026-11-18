import { environment, LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Post } from "@xeet/core";
import type { Options } from "./settings";

export interface DraftInfo {
  id: string;
  title: string;
  savedAt: string;
}
export interface Draft extends DraftInfo {
  post: Post;
  options: Options;
}
const prefix = "draft:";
const directory = () => join(environment.supportPath, "drafts");
function draftPath(id: string) {
  if (!/^[\da-f-]{36}$/.test(id)) throw new Error("Invalid draft ID.");
  return join(directory(), `${id}.json`);
}

export async function listDrafts(): Promise<DraftInfo[]> {
  const items = await LocalStorage.allItems();
  return Object.entries(items)
    .filter(([key]) => key.startsWith(prefix))
    .flatMap(([, value]) => {
      try {
        const draft = JSON.parse(String(value));
        return draft.id && draft.savedAt ? [draft as DraftInfo] : [];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveDraft(post: Post, options: Options, id: string = randomUUID()): Promise<DraftInfo> {
  await mkdir(directory(), { recursive: true });
  const info: DraftInfo = {
    id,
    title: post.text.trim().split("\n")[0]?.slice(0, 100) || "Untitled Post",
    savedAt: new Date().toISOString(),
  };
  const destination = draftPath(id);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify({ ...info, post, options }), { mode: 0o600, flag: "wx" });
  await rename(temporary, destination);
  await LocalStorage.setItem(`${prefix}${id}`, JSON.stringify(info));
  const drafts = await listDrafts();
  for (const old of drafts.slice(50)) await deleteDraft(old.id);
  return info;
}

export async function loadDraft(id: string): Promise<Draft> {
  try {
    return JSON.parse(await readFile(draftPath(id), "utf8"));
  } catch {
    throw new Error("This draft could not be read. Delete it from Saved Drafts, then save a new copy.");
  }
}

export async function deleteDraft(id: string): Promise<void> {
  await unlink(draftPath(id)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  await LocalStorage.removeItem(`${prefix}${id}`);
}
