import { LocalStorage } from "@raycast/api";
import type { ApiSave } from "pond-api";
import { pond } from "../api/client";

const KEY = "recently-opened";
const LIMIT = 6;

async function readIds(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(KEY);
  return stored ? stored.split(",").filter(Boolean).slice(0, LIMIT) : [];
}

export async function recordOpened(save: Pick<ApiSave, "id">): Promise<void> {
  const ids = [save.id, ...(await readIds()).filter((id) => id !== save.id)].slice(0, LIMIT);
  await LocalStorage.setItem(KEY, ids.join(","));
}

/** Ids from another library or for deleted saves simply match nothing. */
export async function recentlyOpened(): Promise<ApiSave[]> {
  const ids = await readIds();
  if (!ids.length) return [];
  const page = await pond().query({ scope: { saveIds: ids }, include: ["saves"], limit: LIMIT });
  const byId = new Map((page.saves ?? []).map((save) => [save.id, save]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}
