import { Clipboard } from "@raycast/api";
import { ClipboardEntry } from "./interfaces/clipboardEntry.interface";
import { getHistoryFromStorage, updateStorageHistory } from "./utils/storage";
import { randomUUID } from "node:crypto";
import { CLIPBOARD_OFFSETS } from "./constants";

function mergeEntryIntoHistory(history: ClipboardEntry[], text: string): boolean {
  if (history[0]?.content === text) return false;

  const existingIndex = history.findIndex((e) => e.content === text);
  if (existingIndex !== -1) {
    const [entry] = history.splice(existingIndex, 1);
    history.unshift(entry);
  } else {
    history.unshift({ id: randomUUID(), content: text, createdAt: Date.now(), favorite: false });
  }
  return true;
}

export default async function ClipboardWatcher() {
  const history = await getHistoryFromStorage();

  const recentTexts = (await Promise.all(CLIPBOARD_OFFSETS.map((offset) => Clipboard.readText({ offset }))))
    .filter(Boolean)
    .reverse() as string[];

  if (recentTexts.length === 0) return;

  const changed = recentTexts.reduce((acc, text) => mergeEntryIntoHistory(history, text) || acc, false);

  if (changed) await updateStorageHistory(history);
}
