import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, MessageWithId } from "./openai";
import { getPreferenceValues } from "@raycast/api";

export function useConversation() {
  const [messages, setMessages] = useState<ReadonlyArray<MessageWithId>>([]);
  const [loading, setLoading] = useState(false);
  const conversation = useRef<Conversation | null>(null);

  const getConversation = useCallback(() => {
    if (conversation.current === null) {
      const preference = getPreferenceValues();
      if (!preference.apiKey) {
        throw new Error("No OpenAI API key found in config");
      }
      conversation.current = Conversation.getInstance(preference.apiKey);
    }
    return conversation.current;
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    const conversation = getConversation();
    setLoading(true);
    await conversation.ask(message);
    setLoading(false);
  }, []);

  useEffect(() => {
    getConversation().on("message", () => {
      setMessages(getConversation().getMessages());
    });
    return () => {
      getConversation().removeAllListeners();
    };
  }, []);

  return useMemo(() => ({ messages, sendMessage, loading }), [messages, sendMessage, loading]);
}
