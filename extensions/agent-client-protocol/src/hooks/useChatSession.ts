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
  loadConversation: (sessionId: string, agent: AgentConfig) => Promise<void>;
}

const logger = createLogger("useChatSession");

export function useChatSession(): UseChatSessionResult {
  const acpClientRef = useRef<ACPClient | undefined>(undefined);
  const storageServiceRef = useRef<StorageService | undefined>(undefined);
  const sessionServiceRef = useRef<SessionService | undefined>(undefined);

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
  const isLoadingConversationRef = useRef(false);
  const activeSessionIdRef = useRef<string | null>(null);

  const refreshConversation = useCallback(
    async (sessionId: string) => {
      const latest = await sessionService.getSession(sessionId);
      if (latest) {
        setConversation(latest);
        setMessages(latest.messages);
      }
    },
    [sessionService]
  );

  const handleStreamingMessage = useCallback(
    (_message: SessionMessage) => {
      const currentId = activeSessionIdRef.current;
      if (!currentId) {
        return;
      }
      void refreshConversation(currentId);
    },
    [refreshConversation]
  );

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

      logger.info("Starting new session", {
        agentId: agent.id,
        workingDirectory: agent.workingDirectory,
        agentName: agent.name
      });

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

      // Reuse existing connection if it's for the same agent
      let agentConnection = connection;
      if (!agentConnection || agentConnection.agentId !== agent.id) {
        logger.info("Creating new agent connection", {
          agentId: agent.id,
          previousAgentId: agentConnection?.agentId
        });
        agentConnection = await acpClient.connect(agent);
        setConnection(agentConnection);
      } else {
        logger.info("Reusing existing agent connection", {
          agentId: agent.id,
          connectionId: agentConnection.id
        });
      }

      const sessionWorkingDirectory = agent.workingDirectory ?? process.cwd();
      logger.info("Creating session with working directory", {
        workingDirectory: sessionWorkingDirectory,
        agentConfiguredDir: agent.workingDirectory,
        fallbackDir: process.cwd()
      });

      const session = await sessionService.createSession({
        agentConnectionId: agentConnection.id,
        agentConfigId: agent.id,
        prompt,
        context: {
          workingDirectory: sessionWorkingDirectory,
          files: [],
          additionalContext: {}
        },
        metadata: {
          title: prompt.slice(0, 60)
        }
      });

      setConversation(session);
      setMessages(session.messages);
      if (activeSessionIdRef.current) {
        sessionService.offSessionMessage(activeSessionIdRef.current);
      }
      activeSessionIdRef.current = session.sessionId;
      sessionService.onSessionMessage(session.sessionId, handleStreamingMessage);

      // Refresh conversation to ensure any streaming messages are captured
      await refreshConversation(session.sessionId);

      setStatus("ready");

      logger.info("Session initialized", { sessionId: session.sessionId });
    } catch (error) {
      setStatus("idle");
      await ErrorHandler.handleError(error, "Starting chat session");
    }
  }, [acpClient, sessionService, handleStreamingMessage, connection]);

  const sendMessage = useCallback(async (message: string) => {
    if (status === "processing" || status === "connecting") {
      return;
    }

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

      if (!activeAgent) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Agent Not Selected",
          message: "Select an agent before continuing the conversation."
        });
        setStatus("ready");
        return;
      }

      // Lazily connect to agent if not already connected
      let agentConnection = connection;
      if (!agentConnection || agentConnection.agentId !== activeAgent.id) {
        logger.info("Connecting to agent for message", {
          agentId: activeAgent.id,
          sessionId: conversation.sessionId
        });
        agentConnection = await acpClient.connect(activeAgent);
        setConnection(agentConnection);
      }

      await sessionService.sendMessage(conversation.sessionId, message, activeAgent);

      await refreshConversation(conversation.sessionId);

      setStatus("ready");
    } catch (error) {
      setStatus("ready");
      await ErrorHandler.handleError(error, "Sending message to agent");
    }
  }, [status, conversation, activeAgent, sessionService, startSession, refreshConversation, connection, acpClient]);

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
      if (activeSessionIdRef.current) {
        sessionService.offSessionMessage(activeSessionIdRef.current);
        activeSessionIdRef.current = null;
      }
      setConversation(null);
      setConnection(null);
      setMessages([]);
      setStatus("idle");
    }
  }, [conversation, connection, acpClient, sessionService]);

  const loadConversation = useCallback(
    async (sessionId: string, agent: AgentConfig) => {

      if (isLoadingConversationRef.current) {
        return;
      }

      try {
        isLoadingConversationRef.current = true;
        setActiveAgent(agent);

        logger.info("Loading conversation", {
          sessionId,
          agentId: agent.id
        });

        const existing = await sessionService.getSession(sessionId);
        if (!existing) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Conversation Not Found",
            message: "The selected conversation could not be loaded."
          });
          setStatus("idle");
          return;
        }

        // Just load the conversation - don't connect to agent yet
        // Agent will be connected lazily when user sends a message
        setConversation(existing);
        setMessages(existing.messages);
        if (activeSessionIdRef.current) {
          sessionService.offSessionMessage(activeSessionIdRef.current);
        }
        activeSessionIdRef.current = existing.sessionId;
        sessionService.onSessionMessage(existing.sessionId, handleStreamingMessage);
        setStatus("ready");

        logger.info("Conversation loaded successfully", {
          sessionId,
          messageCount: existing.messages.length
        });
      } catch (error) {
        setStatus("idle");
        await ErrorHandler.handleError(error, "Loading conversation");
      } finally {
        isLoadingConversationRef.current = false;
      }
    },
    [sessionService, handleStreamingMessage]
  );

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
      activeAgent,
      loadConversation
    }),
    [
      conversation,
      connection,
      messages,
      status,
      activeAgent,
      startSession,
      sendMessage,
      resetSession,
      loadConversation
    ]
  );
}
