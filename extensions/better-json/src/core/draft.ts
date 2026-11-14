import { LocalStorage } from "@raycast/api";

const DRAFT_KEY = "better-json.input-draft.v1";
let pendingWrite: Promise<void> = Promise.resolve();

export async function readDraft(): Promise<string | undefined> {
  await pendingWrite.catch(() => undefined);
  return LocalStorage.getItem<string>(DRAFT_KEY);
}

export function saveDraft(source: string): Promise<void> {
  // Serialize writes so an earlier keystroke cannot restore a draft after submit.
  const write = pendingWrite
    .catch(() => undefined)
    .then(() => (source.trim() ? LocalStorage.setItem(DRAFT_KEY, source) : LocalStorage.removeItem(DRAFT_KEY)));
  pendingWrite = write;
  return write;
}
