import { useEffect, useState } from "react";
import { SignalChat } from "./types";
import { getStoredSignalChats, saveStoredSignalChats } from "./local-storage";

export function useSignalChats() {
  const [chats, setChats] = useState<Array<SignalChat>>();

  useEffect(() => {
    getStoredSignalChats().then((chats) => {
      setChats(chats);
    });
  }, []);

  return {
    chats: chats || [],
    isLoading: chats === undefined,
    updateChats: async (chats: Array<SignalChat>) => {
      setChats(chats);
      await saveStoredSignalChats(chats);
    },
  };
}
