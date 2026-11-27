import { LocalStorage } from "@raycast/api";
import { getApiBaseUrl } from "../config";
import { draftSchema, type MealDraft } from "./schemas";

const PREFIX = "ipfos.meals.draft:";
export function mealsAccountKey(subject: string): string {
  return `${getApiBaseUrl()}|${subject}`;
}
const key = (account: string, planId: string) => `${PREFIX}${encodeURIComponent(account)}:${planId}`;

export async function readMealDraft(account: string, planId: string): Promise<MealDraft | null> {
  const raw = await LocalStorage.getItem<string>(key(account, planId));
  if (!raw) return null;
  try {
    const draft = draftSchema.parse(JSON.parse(raw));
    if (draft.planId === planId && new Set(draft.days.map((day) => day.day)).size === 5) return draft;
  } catch {
    /* Discard unusable drafts without blocking saved-plan access. */
  }
  await LocalStorage.removeItem(key(account, planId));
  return null;
}
export const writeMealDraft = (account: string, draft: MealDraft) =>
  LocalStorage.setItem(key(account, draft.planId), JSON.stringify(draft));
export const removeMealDraft = (account: string, planId: string) => LocalStorage.removeItem(key(account, planId));
export async function readMealDrafts(account: string): Promise<MealDraft[]> {
  const prefix = `${PREFIX}${encodeURIComponent(account)}:`;
  const items = await LocalStorage.allItems();
  const drafts = await Promise.all(
    Object.keys(items)
      .filter((name) => name.startsWith(prefix))
      .map((name) => readMealDraft(account, name.slice(prefix.length))),
  );
  return drafts.filter((draft) => draft !== null).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}
export async function clearMealDrafts(): Promise<void> {
  const items = await LocalStorage.allItems();
  await Promise.all(
    Object.keys(items)
      .filter((name) => name.startsWith(PREFIX))
      .map((name) => LocalStorage.removeItem(name)),
  );
}
