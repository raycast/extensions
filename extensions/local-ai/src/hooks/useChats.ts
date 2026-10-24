import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { Chat } from "../lib/chats/types";
import { loadChats, saveChats } from "../services/chat-store";

export function useChats() {
  const { data, isLoading, revalidate } = useCachedPromise(loadChats);

  async function mutate(change: (current: Chat[]) => Chat[]): Promise<boolean> {
    const latest = await loadChats();
    if (latest.readOnly) {
      await showToast({ style: Toast.Style.Failure, title: "Chats are read-only", message: latest.notice });
      return false;
    }
    try {
      await saveChats(change(latest.chats));
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save chats",
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      revalidate();
    }
  }

  return {
    chats: data?.chats ?? [],
    isLoading,
    readOnly: data?.readOnly ?? false,
    notice: data?.notice,
    mutate,
  };
}
