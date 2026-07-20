/**
 * Conversations Hook
 *
 * Manages conversations across all Letta agents.
 * Provides unified view of all chats with local persistence.
 */

import { LocalStorage } from "@raycast/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Conversation, Message, ConversationSummary, AgentWithAccount } from "../types";
import { createConversationSummary, generateConversationTitle } from "../types";

/** Generate a unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const STORAGE_KEY = "letta-conversations";

interface UseConversationsReturn {
  /** All conversations */
  conversations: Conversation[];
  /** Conversations filtered by agent (or all if agentFilter is "all") */
  filteredConversations: Conversation[];
  /** Conversation summaries for list display */
  summaries: ConversationSummary[];
  /** Currently active conversation */
  activeConversation: Conversation | null;
  /** Loading state */
  isLoading: boolean;
  /** Current agent filter */
  agentFilter: string;
  /** Set agent filter ("all" or agent ID) */
  setAgentFilter: (filter: string) => void;
  /** Start a new conversation with an agent */
  startConversation: (agent: AgentWithAccount) => Conversation;
  /** Add a message to a conversation */
  addMessage: (conversationId: string, message: Omit<Message, "id">) => void;
  updateLastMessage: (conversationId: string, content: string, reasoning?: string, shouldSave?: boolean) => void;
  /** Set the active conversation */
  setActiveConversation: (conversationId: string | null) => void;
  /** Delete a conversation */
  deleteConversation: (conversationId: string) => void;
  /** Clear all conversations */
  clearAllConversations: () => void;
  /** Get conversation by ID */
  getConversation: (conversationId: string) => Conversation | undefined;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Load conversations from storage
  useEffect(() => {
    async function load() {
      try {
        const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Conversation[];
          // Restore Date objects and migrate old conversations
          const restored = parsed.map((conv) => ({
            ...conv,
            // Migrate old conversations without account info
            accountId: conv.accountId || "project1",
            accountName: conv.accountName || "Default",
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
            messages: conv.messages.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          }));
          setConversations(restored);
        }
      } catch (e) {
        console.error("Failed to load conversations:", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Save conversations to storage
  const save = useCallback(async (convs: Conversation[]) => {
    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
    } catch (e) {
      console.error("Failed to save conversations:", e);
    }
  }, []);

  // Filter conversations by agent
  const filteredConversations = useMemo(() => {
    if (agentFilter === "all") return conversations;
    return conversations.filter((c) => c.agentId === agentFilter);
  }, [conversations, agentFilter]);

  // Sort by most recent and create summaries
  const summaries = useMemo(() => {
    return filteredConversations
      .map(createConversationSummary)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [filteredConversations]);

  // Get active conversation
  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Start a new conversation
  const startConversation = useCallback(
    (agent: AgentWithAccount): Conversation => {
      const newConversation: Conversation = {
        id: generateId(),
        agentId: agent.id,
        agentName: agent.name,
        agentColor: agent.color,
        accountId: agent.accountId,
        accountName: agent.accountName,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setConversations((prev) => {
        const updated = [newConversation, ...prev];
        save(updated);
        return updated;
      });

      setActiveConversationId(newConversation.id);
      return newConversation;
    },
    [save]
  );

  // Add a message to a conversation
  const addMessage = useCallback(
    (conversationId: string, message: Omit<Message, "id">) => {
      const newMessage: Message = {
        ...message,
        id: generateId(),
      };

      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id !== conversationId) return conv;

          const updatedMessages = [...conv.messages, newMessage];
          return {
            ...conv,
            messages: updatedMessages,
            title: conv.title || generateConversationTitle(updatedMessages),
            updatedAt: new Date(),
          };
        });
        save(updated);
        return updated;
      });
    },
    [save]
  );

  const updateLastMessage = useCallback(
    (conversationId: string, content: string, reasoning?: string, shouldSave = false) => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id !== conversationId) return conv;
          if (conv.messages.length === 0) return conv;

          const messages = [...conv.messages];
          const lastMessage = messages[messages.length - 1];

          if (lastMessage.role === "assistant") {
            messages[messages.length - 1] = {
              ...lastMessage,
              content,
              reasoning,
            };
          }

          return {
            ...conv,
            messages,
            updatedAt: new Date(),
          };
        });
        if (shouldSave) {
          save(updated);
        }
        return updated;
      });
    },
    [save]
  );

  // Set active conversation
  const setActiveConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(
    (conversationId: string) => {
      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== conversationId);
        save(updated);
        return updated;
      });

      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
    },
    [activeConversationId, save]
  );

  // Clear all conversations
  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
    save([]);
  }, [save]);

  // Get conversation by ID
  const getConversation = useCallback(
    (conversationId: string) => {
      return conversations.find((c) => c.id === conversationId);
    },
    [conversations]
  );

  return {
    conversations,
    filteredConversations,
    summaries,
    activeConversation,
    isLoading,
    agentFilter,
    setAgentFilter,
    startConversation,
    addMessage,
    updateLastMessage,
    setActiveConversation,
    deleteConversation,
    clearAllConversations,
    getConversation,
  };
}
