import { LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";

export interface Draft {
  id: string;
  text: string;
  url: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

const DRAFTS_KEY = "compose-drafts";

export async function getDrafts(): Promise<Draft[]> {
  const raw = await LocalStorage.getItem<string>(DRAFTS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Draft[];
}

export async function saveDraft(fields: {
  text: string;
  url: string;
  images: string[];
}): Promise<Draft> {
  const now = new Date().toISOString();
  const draft: Draft = {
    id: nanoid(),
    text: fields.text,
    url: fields.url,
    images: fields.images,
    createdAt: now,
    updatedAt: now,
  };
  const drafts = await getDrafts();
  drafts.push(draft);
  await LocalStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  return draft;
}

export async function updateDraft(
  id: string,
  fields: { text: string; url: string; images: string[] },
): Promise<void> {
  const drafts = await getDrafts();
  const idx = drafts.findIndex((d) => d.id === id);
  if (idx === -1) return;
  drafts[idx] = {
    ...drafts[idx],
    text: fields.text,
    url: fields.url,
    images: fields.images,
    updatedAt: new Date().toISOString(),
  };
  await LocalStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export async function removeDraft(id: string): Promise<void> {
  const drafts = await getDrafts();
  const filtered = drafts.filter((d) => d.id !== id);
  await LocalStorage.setItem(DRAFTS_KEY, JSON.stringify(filtered));
}
