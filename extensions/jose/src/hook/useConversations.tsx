import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConversationsHookType, ConversationType } from "../type/conversation";

export function useConversations(): ConversationsHookType {
  const [data, setData] = useState<ConversationType[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const localStorageName = "conversations";

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(localStorageName);

      if (stored) {
        setData((previous) => [...previous, ...JSON.parse(stored)]);
      }

      setLoading(false);
    })();
  }, []);
  useEffect(() => {
    LocalStorage.setItem(
      localStorageName,
      JSON.stringify(data.filter((conversation: ConversationType) => conversation.chats.length > 0))
    );
  }, [data]);

  const add = useCallback(
    async (conversation: ConversationType) => {
      setData([...data, conversation]);
    },
    [setData, data]
  );

  const update = useCallback(
    async (conversation: ConversationType) => {
      setData((prev) => {
        return prev.map((x) => {
          if (x.conversationId === conversation.conversationId) {
            return conversation;
          }
          return x;
        });
      });
    },
    [setData, data]
  );

  const remove = useCallback(
    async (conversation: ConversationType) => {
      const newConversations: ConversationType[] = data.filter(
        (item: ConversationType) => item.conversationId !== conversation.conversationId
      );
      setData(newConversations);

      await showToast({
        title: "Conversation removed!",
        style: Toast.Style.Success,
      });
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    setData([]);

    await showToast({
      title: "Conversations cleared!",
      style: Toast.Style.Success,
    });
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear }),
    [data, isLoading, add, update, remove, clear]
  );
}
