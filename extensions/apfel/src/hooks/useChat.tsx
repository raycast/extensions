import { clearSearchBar, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { useHistory } from "./useHistory";
import { askApfel } from "../api/apfel/ask";

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);

  const history = useHistory();

  async function ask(question: string, model: Model) {
    clearSearchBar();
    setLoading(true);

    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });

    const chat: Chat = {
      id: uuidv4(),
      question,
      answer: "",
      created_at: new Date().toISOString(),
    };

    setData((prev) => {
      return [...prev, chat];
    });

    try {
      const answer = await askApfel(question, model);

      setData((prev) => prev.map((c) => (c.id === chat.id ? { ...c, answer } : c)));
      setSelectedChatId(chat.id);

      history.add({ ...chat, answer });

      toast.title = "Got your answer!";
      toast.style = Toast.Style.Success;
    } catch (err) {
      setData((prev) => prev.filter((c) => c.id !== chat.id));

      toast.title = "Failed to get answer";
      toast.message = err instanceof Error ? err.message : String(err);
      toast.style = Toast.Style.Failure;
    } finally {
      setLoading(false);
    }
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear],
  );
}
