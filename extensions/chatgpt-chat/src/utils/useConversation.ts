import { randomUUID } from "crypto";
import { useCallback, useMemo, useState } from "react";
import { ask, Message } from "./openai";

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const addMessageChunk = useCallback(
    (message: Message) => {
      setMessages((messages) => {
        if (messages.find((m) => m.id === message.id)) {
          return messages.map((m) => (m.id === message.id ? { ...m, ...message } : m));
        }
        return [...messages, message];
      });
    },
    [messages]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const id = randomUUID();
      const allMessages: Message[] = [...messages, { id, content, role: "user" }];
      setMessages(allMessages);

      setLoading(true);

      try {
        await ask(
          allMessages.map(({ id: _id, ...m }) => m),
          addMessageChunk
        );
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  return useMemo(() => ({ messages, sendMessage, loading }), [messages, sendMessage, loading]);
}
