import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { ACPClient } from "@/services/acpClient";
import { SessionService } from "@/services/sessionService";
import { StorageService } from "@/services/storageService";
import type { AgentConfig, AgentConnection } from "@/types/extension";
import type { ConversationSession, SessionMessage, ProjectContext } from "@/types/entities";
import { ErrorHandler } from "@/utils/errors";
import { createLogger } from "@/utils/logging";
import { ContextService } from "@/services/contextService";
import { PersistenceService } from "@/services/persistenceService";

type ChatStatus = "idle" | "connecting" | "ready" | "processing";

interface ChatSessionState {
  conversation: ConversationSession | null;
  connection: AgentConnection | null;
  messages: SessionMessage[];
  status: ChatStatus;
  contexts: ProjectContext[];
}

interface UseChatSessionResult extends ChatSessionState {
  startSession: (agent: AgentConfig, prompt: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  cancelMessage: () => Promise<void>;
  resetSession: () => Promise<void>;
  setActiveAgent: (agent: AgentConfig | null) => void;
  activeAgent: AgentConfig | null;
  loadConversation: (sessionId: string, agent: AgentConfig) => Promise<void>;
  addFileContexts: (paths: string[]) => Promise<ProjectContext[]>;
  addDirectoryContexts: (paths: string[]) => Promise<ProjectContext[]>;
  removeContext: (contextId: string) => Promise<void>;
  refreshContexts: () => Promise<void>;
  switchMode: (modeId: string) => Promise<void>;
  runSlashCommand: (commandName: string, input?: string) => Promise<void>;
}

const logger = createLogger("useChatSession");

export function useChatSession(): UseChatSessionResult {
  const acpClientRef = useRef<ACPClient | undefined>(undefined);
  const storageServiceRef = useRef<StorageService | undefined>(undefined);
  const sessionServiceRef = useRef<SessionService | undefined>(undefined);
  const contextServiceRef = useRef<ContextService | undefined>(undefined);
  const persistenceServiceRef = useRef<PersistenceService | undefined>(undefined);

  if (!acpClientRef.current) {
    acpClientRef.current = new ACPClient();
  }

  if (!storageServiceRef.current) {
    storageServiceRef.current = new StorageService();
  }

  if (!persistenceServiceRef.current) {
    persistenceServiceRef.current = new PersistenceService(storageServiceRef.current);
  }

  if (!contextServiceRef.current) {
    contextServiceRef.current = new ContextService();
  }

  if (!sessionServiceRef.current) {
    sessionServiceRef.current = new SessionService(
      storageServiceRef.current,
      acpClientRef.current,
      contextServiceRef.current,
      persistenceServiceRef.current,
    );
  }

  const acpClient = acpClientRef.current;
  const sessionService = sessionServiceRef.current;
  const storageService = storageServiceRef.current;
  const contextService = contextServiceRef.current;

  const [activeAgent, setActiveAgent] = useState<AgentConfig | null>(null);
  const [conversation, setConversation] = useState<ConversationSession | null>(null);
  const [connection, setConnection] = useState<AgentConnection | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [contexts, setContexts] = useState<ProjectContext[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const isLoadingConversationRef = useRef(false);
  const activeSessionIdRef = useRef<string | null>(null);

  const loadContextsForSession = useCallback(
    async (sessionId: string | null) => {
      if (!sessionId) {
        setContexts([]);
        return;
      }

      try {
        const sessionContexts = await contextService.getSessionContext(sessionId);
        setContexts(sessionContexts);
      } catch (error) {
        logger.warn("Failed to load contexts for session", { sessionId, error });
        setContexts([]);
      }
    },
    [contextService],
  );

  const refreshContexts = useCallback(async () => {
    await loadContextsForSession(conversation?.sessionId ?? null);
  }, [conversation, loadContextsForSession]);

  const addFileContexts = useCallback(
    async (paths: string[]): Promise<ProjectContext[]> => {
      if (!conversation) {
        throw new Error("No active conversation available for adding context");
      }

      if (paths.length === 0) {
        return [];
      }

      try {
        const added: ProjectContext[] = [];
        for (const filePath of paths) {
          const context = await contextService.addFileFromPath(conversation.sessionId, filePath);
          added.push(context);
        }
        await loadContextsForSession(conversation.sessionId);
        return added;
      } catch (error) {
        await ErrorHandler.handleError(error, "Adding file context");
        throw error;
      }
    },
    [conversation, contextService, loadContextsForSession],
  );

  const addDirectoryContexts = useCallback(
    async (paths: string[]): Promise<ProjectContext[]> => {
      if (!conversation) {
        throw new Error("No active conversation available for adding context");
      }

      if (paths.length === 0) {
        return [];
      }

      try {
        const added: ProjectContext[] = [];
        for (const directoryPath of paths) {
          const context = await contextService.addDirectoryFromPath(conversation.sessionId, directoryPath);
          added.push(context);
        }
        await loadContextsForSession(conversation.sessionId);
        return added;
      } catch (error) {
        await ErrorHandler.handleError(error, "Adding directory context");
        throw error;
      }
    },
    [conversation, contextService, loadContextsForSession],
  );

  const removeContext = useCallback(
    async (contextId: string): Promise<void> => {
      try {
        await contextService.removeContext(contextId);
        if (conversation) {
          await loadContextsForSession(conversation.sessionId);
        } else {
          setContexts((current) => current.filter((ctx) => ctx.id !== contextId));
        }
      } catch (error) {
        await ErrorHandler.handleError(error, "Removing context");
        throw error;
      }
    },
    [contextService, conversation, loadContextsForSession],
  );

  const refreshConversation = useCallback(
    async (sessionId: string) => {
      const latest = await sessionService.getSession(sessionId);
      if (latest) {
        setConversation(latest);
        setMessages(latest.messages);
      }
    },
    [sessionService],
  );

  const handleStreamingMessage = useCallback(() => {
    const currentId = activeSessionIdRef.current;
    if (!currentId) {
      return;
    }
    void refreshConversation(currentId);
  }, [refreshConversation]);

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

  const startSession = useCallback(
    async (agent: AgentConfig, prompt: string) => {
      if (!prompt.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Enter a prompt",
          message: "Please provide a message to start the conversation.",
        });
        return;
      }

      try {
        setStatus("connecting");
        setActiveAgent(agent);

        logger.info("Starting new session", {
          agentId: agent.id,
          workingDirectory: agent.workingDirectory,
          agentName: agent.name,
        });

        const userMessage: SessionMessage = {
          id: `local-${Date.now()}`,
          role: "user",
          content: prompt,
          timestamp: new Date(),
          metadata: {
            source: "user",
            messageType: "text",
            sequence: 0,
          },
        };
        setMessages([userMessage]);

        // Reuse existing connection if it's for the same agent
        let agentConnection = connection;
        if (!agentConnection || agentConnection.agentId !== agent.id) {
          logger.info("Creating new agent connection", {
            agentId: agent.id,
            previousAgentId: agentConnection?.agentId,
          });
          agentConnection = await acpClient.connect(agent);
          setConnection(agentConnection);
        } else {
          logger.info("Reusing existing agent connection", {
            agentId: agent.id,
            connectionId: agentConnection.id,
          });
        }

        const sessionWorkingDirectory = agent.workingDirectory ?? process.cwd();
        logger.info("Creating session with working directory", {
          workingDirectory: sessionWorkingDirectory,
          agentConfiguredDir: agent.workingDirectory,
          fallbackDir: process.cwd(),
        });

        const session = await sessionService.createSession({
          agentConnectionId: agentConnection.id,
          agentConfigId: agent.id,
          prompt,
          context: {
            workingDirectory: sessionWorkingDirectory,
            files: [],
            additionalContext: {},
          },
          metadata: {
            title: prompt.slice(0, 60),
          },
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
        await loadContextsForSession(session.sessionId);

        setStatus("ready");

        logger.info("Session initialized", { sessionId: session.sessionId });
      } catch (error) {
        setStatus("idle");
        await ErrorHandler.handleError(error, "Starting chat session");
      }
    },
    [acpClient, sessionService, handleStreamingMessage, connection, refreshConversation, loadContextsForSession],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (status === "processing" || status === "connecting") {
        return;
      }

      if (!conversation) {
        if (!activeAgent) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Select an agent",
            message: "Choose an agent before sending a message.",
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
          message: "Please enter a message to send.",
        });
        return;
      }

      try {
        setStatus("processing");

        logger.info("Sending follow-up message", {
          sessionId: conversation.sessionId,
          length: message.length,
        });

        if (!activeAgent) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Agent Not Selected",
            message: "Select an agent before continuing the conversation.",
          });
          setStatus("ready");
          return;
        }

        // Lazily connect to agent if not already connected
        let agentConnection = connection;
        if (!agentConnection || agentConnection.agentId !== activeAgent.id) {
          logger.info("Connecting to agent for message", {
            agentId: activeAgent.id,
            sessionId: conversation.sessionId,
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
    },
    [status, conversation, activeAgent, sessionService, startSession, refreshConversation, connection, acpClient],
  );

  const runSlashCommand = useCallback(
    async (commandName: string, input?: string) => {
      const trimmedInput = input?.trim();
      const payload = trimmedInput ? `/${commandName} ${trimmedInput}` : `/${commandName}`;
      await sendMessage(payload);
    },
    [sendMessage],
  );

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
        error,
      });
    } finally {
      if (activeSessionIdRef.current) {
        sessionService.offSessionMessage(activeSessionIdRef.current);
        activeSessionIdRef.current = null;
      }
      setConversation(null);
      setConnection(null);
      setMessages([]);
      setContexts([]);
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
          agentId: agent.id,
        });

        const existing = await sessionService.getSession(sessionId);
        if (!existing) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Conversation Not Found",
            message: "The selected conversation could not be loaded.",
          });
          setContexts([]);
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
        await loadContextsForSession(existing.sessionId);
        setStatus("ready");

        logger.info("Conversation loaded successfully", {
          sessionId,
          messageCount: existing.messages.length,
        });
      } catch (error) {
        setStatus("idle");
        await ErrorHandler.handleError(error, "Loading conversation");
      } finally {
        isLoadingConversationRef.current = false;
      }
    },
    [sessionService, handleStreamingMessage, loadContextsForSession],
  );

  const cancelMessage = useCallback(async () => {
    if (status !== "processing") {
      logger.warn("Attempted to cancel message when not processing", { status });
      return;
    }

    if (!conversation) {
      logger.warn("Attempted to cancel message without active conversation");
      return;
    }

    try {
      logger.info("Cancelling message", { sessionId: conversation.sessionId });

      await showToast({
        style: Toast.Style.Animated,
        title: "Cancelling...",
        message: "Stopping the agent",
      });

      // Send cancellation notification to the agent
      await acpClient.cancelSession(conversation.sessionId);

      // Update status
      setStatus("ready");

      await showToast({
        style: Toast.Style.Success,
        title: "Cancelled",
        message: "Agent stopped processing",
      });

      // Refresh conversation to get any final updates
      await refreshConversation(conversation.sessionId);

      logger.info("Message cancelled successfully", { sessionId: conversation.sessionId });
    } catch (error) {
      setStatus("ready");
      await ErrorHandler.handleError(error, "Cancelling message");
    }
  }, [status, conversation, acpClient, refreshConversation]);

  const switchMode = useCallback(
    async (modeId: string) => {
      if (!conversation) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Active Conversation",
          message: "Start a conversation before switching modes.",
        });
        return;
      }

      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Switching Mode",
          message: "Changing agent mode...",
        });

        await sessionService.setSessionMode(conversation.sessionId, modeId);
        await refreshConversation(conversation.sessionId);

        const updatedSession = await sessionService.getSession(conversation.sessionId);
        const modeName = updatedSession?.currentMode?.name ?? modeId;

        await showToast({
          style: Toast.Style.Success,
          title: "Mode Switched",
          message: `Now in ${modeName} mode`,
        });

        logger.info("Mode switched successfully", {
          sessionId: conversation.sessionId,
          modeId,
          modeName,
        });
      } catch (error) {
        await ErrorHandler.handleError(error, "Switching agent mode");
      }
    },
    [conversation, sessionService, refreshConversation],
  );

  return useMemo(
    () => ({
      conversation,
      connection,
      messages,
      status,
      contexts,
      startSession,
      sendMessage,
      cancelMessage,
      resetSession,
      setActiveAgent,
      activeAgent,
      loadConversation,
      addFileContexts,
      addDirectoryContexts,
      removeContext,
      refreshContexts,
      switchMode,
      runSlashCommand,
    }),
    [
      conversation,
      connection,
      messages,
      status,
      contexts,
      activeAgent,
      startSession,
      sendMessage,
      cancelMessage,
      resetSession,
      loadConversation,
      addFileContexts,
      addDirectoryContexts,
      removeContext,
      refreshContexts,
      switchMode,
      runSlashCommand,
    ],
  );
}
