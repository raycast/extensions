import { LocalStorage } from "@raycast/api";
import { CHAT_STORE_SPEC } from "../lib/chats/schema";
import { CHAT_STORE_VERSION, CHATS_BACKUP_KEY, CHATS_STORAGE_KEY, type Chat, type ChatStore } from "../lib/chats/types";
import { backupKey, isNewerStore, planVersionedLoad } from "../lib/versioned-store";

export interface LoadedChats {
  chats: Chat[];
  readOnly: boolean;
  notice?: string;
}

const NOTICES = {
  corrupt: "Saved chats could not be read. A backup was kept and the chat list was reset.",
  partial: "Some saved chats could not be read and were backed up.",
  newer: "These chats were saved by a newer version of Local AI. Update the extension to edit them.",
};

export async function loadChats(): Promise<LoadedChats> {
  const plan = planVersionedLoad(await LocalStorage.getItem<string>(CHATS_STORAGE_KEY), CHAT_STORE_SPEC, emptyStore);
  if (plan.readOnly) return { chats: [], readOnly: true, notice: NOTICES.newer };

  if (plan.backup !== undefined) await LocalStorage.setItem(backupKey(CHATS_BACKUP_KEY, new Date()), plan.backup);
  if (plan.save) await saveChats(plan.store.chats);
  return { chats: plan.store.chats, readOnly: false, notice: plan.notice && NOTICES[plan.notice] };
}

export async function saveChats(chats: Chat[]): Promise<void> {
  if (isNewerStore(await LocalStorage.getItem<string>(CHATS_STORAGE_KEY), CHAT_STORE_VERSION)) {
    throw new Error(NOTICES.newer);
  }
  await LocalStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify({ version: CHAT_STORE_VERSION, chats }));
}

function emptyStore(): ChatStore {
  return { version: CHAT_STORE_VERSION, chats: [] };
}
