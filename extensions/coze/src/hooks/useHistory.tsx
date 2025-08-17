import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback } from "react";

export interface History {
  space_id: string;
  bot_id: string;
  conversation_id: string;
  message: string;
  created_at?: number;
}

const localStorageKey = `history`;

const filter = (histories: History[]) => {
  return (
    histories
      // remove invalid conversation
      .filter((c) => c.conversation_id && c.conversation_id !== "" && c.message && c.message !== "")
      // remove duplicate
      .filter((c, index, self) => index === self.findIndex((t) => t.conversation_id === c.conversation_id))
      // sort by created_at
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
  );
};

export const loadHistories = async (): Promise<History[]> => {
  try {
    const historiesString = await LocalStorage.getItem(localStorageKey);
    const histories = JSON.parse(historiesString as string) || [];
    return filter(histories);
  } catch (error) {
    console.error(`[loadHistories] error: ${error}`);
    return [];
  }
};

export const useHistory = (): {
  histories: History[];
  setHistories: (newHistories: History[]) => Promise<void>;
  removeHistories: (conversationId?: string) => Promise<void>;
  isLoading: boolean;
} => {
  const { value: histories, setValue, removeValue, isLoading } = useLocalStorage<History[]>(localStorageKey, []);

  const filteredHistories = filter(histories || []);

  const setHistories = useCallback(
    async (savedHistories: History[]): Promise<void> => {
      await setValue(
        filter(
          savedHistories.map((h: History) => ({
            ...h,
            created_at: h.created_at || Date.now(),
          })),
        ),
      );
    },
    [isLoading],
  );

  const removeHistories = useCallback(
    async (conversationId?: string) => {
      if (!conversationId) {
        await removeValue();
        return;
      }
      const old = await loadHistories();
      await setValue(old.filter((h) => h.conversation_id !== conversationId));
    },
    [isLoading],
  );

  return {
    histories: filteredHistories,
    setHistories,
    removeHistories,
    isLoading,
  };
};
