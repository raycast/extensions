import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { ACPClient } from "@/services/acpClient";
import { SessionService } from "@/services/sessionService";
import { StorageService } from "@/services/storageService";
import type { AgentConfig, AgentConnection } from "@/types/extension";
import type { ConversationSession, SessionMessage } from "@/types/entities";
import { ErrorHandler } from "@/utils/errors";
import { createLogger } from "@/utils/logging";

type ChatStatus = "idle" | "connecting" | "ready" | "processing";

interface ChatSessionState {
  conversation: ConversationSession | null;
  connection: AgentConnection | null;
  messages: SessionMessage[];
  status: ChatStatus;
}

interface UseChatSessionResult extends ChatSessionState {
  startSession: (agent: AgentConfig, prompt: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  resetSession: () => Promise<void>;
  setActiveAgent: (agent: AgentConfig | null) => void;
  activeAgent: AgentConfig | null;
}

const logger = createLogger("useChatSession");

export function useChatSession(): UseChatSessionResult {
  const acpClientRef = useRef<ACPClient>();
  const storageServiceRef = useRef<StorageService>();
  const sessionServiceRef = useRef<SessionService>();

  if (!acpClientRef.current) {
    acpClientRef.current = new ACPClient();
  }

  if (!storageServiceRef.current) {
    storageServiceRef.current = new StorageService();
  }

  if (!sessionServiceRef.current) {
    sessionServiceRef.current = new SessionService(
      storageServiceRef.current,
      acpClientRef.current
    );
  }

  const acpClient = acpClientRef.current;
  const sessionService = sessionServiceRef.current;
  const storageService = storageServiceRef.current;

  const [activeAgent, setActiveAgent] = useState<AgentConfig | null>(null);
  const [conversation, setConversation] = useState<ConversationSession | null>(null);
  const [connection, setConnection] = useState<AgentConnection | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");

  useEffect(() => {
    async function initStorage() {
      try {
        await storageService.initialize();
      } catch (error) {
        await ErrorHandler.handleError(error, "Initializing chat session storage");
      }
    }

    initStorage();
  }, [storageService]);

  const startSession = useCallback(async (agent: AgentConfig, prompt: string) => {
    if (!prompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a prompt",
        message: "Please provide a message to start the conversation."
      });
      return;
    }

    try {
      setStatus("connecting");
      setActiveAgent(agent);

      logger.info("Starting new session", { agentId: agent.id });

      const userMessage: SessionMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: prompt,
        timestamp: new Date(),
        metadata: {
          source: "user",
          messageType: "text",
          sequence: 0
        }
      };
      setMessages([userMessage]);

      const agentConnection = await acpClient.connect(agent);
      setConnection(agentConnection);

      const session = await sessionService.createSession({
        agentConnectionId: agentConnection.id,
        prompt,
        context: {
          workingDirectory: agent.workingDirectory ?? process.cwd(),
          files: [],
          additionalContext: {}
        },
        metadata: {
          title: prompt.slice(0, 60)
        }
      });

      setConversation(session);
      setMessages(session.messages);
      setStatus("ready");

      logger.info("Session initialized", { sessionId: session.sessionId });
    } catch (error) {
      setStatus("idle");
      await ErrorHandler.handleError(error, "Starting chat session");
    }
  }, [acpClient, sessionService]);

  const sendMessage = useCallback(async (message: string) => {
    if (!conversation) {
      if (!activeAgent) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Select an agent",
          message: "Choose an agent before sending a message."
        });
        return;
      }

      await startSession(activeAgent, message);
      return;
    }

    if (!message.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a message",
        message: "Please enter a message to send."
      });
      return;
    }

    try {
      setStatus("processing");

      logger.info("Sending follow-up message", {
        sessionId: conversation.sessionId,
        length: message.length
      });

      await sessionService.sendMessage(conversation.sessionId, message);

      const updatedConversation = await sessionService.getSession(conversation.sessionId);

      if (updatedConversation) {
        setConversation(updatedConversation);
        setMessages(updatedConversation.messages);
      }

      setStatus("ready");
    } catch (error) {
      setStatus("ready");
      await ErrorHandler.handleError(error, "Sending message to agent");
    }
  }, [conversation, activeAgent, sessionService, startSession]);

  const resetSession = useCallback(async () => {
    try {
      if (conversation) {
        logger.info("Resetting session", { sessionId: conversation.sessionId });
      }

      if (connection) {
        await acpClient.disconnect();
      }
    } catch (error) {
      logger.warn("Failed to disconnect session during reset", {
        sessionId: conversation?.sessionId,
        error
      });
    } finally {
      setConversation(null);
      setConnection(null);
      setMessages([]);
      setStatus("idle");
    }
  }, [conversation, connection, acpClient]);

  return useMemo(
    () => ({
      conversation,
      connection,
      messages,
      status,
      startSession,
      sendMessage,
      resetSession,
      setActiveAgent,
      activeAgent
    }),
    [
      conversation,
      connection,
      messages,
      status,
      activeAgent,
      startSession,
      sendMessage,
      resetSession
    ]
  );
}
