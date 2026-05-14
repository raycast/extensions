/**
 * Session Service - Conversation Session Management
 *
 * Manages conversation sessions with agents including:
 * - Session creation and lifecycle
 * - Message handling and storage
 * - Context management
 * - Session validation and recovery
 */

import { v4 as uuidv4 } from "uuid";
import { ACPError, ErrorCode } from "@/utils/errors";
import { createLogger, PerformanceLogger } from "@/utils/logging";
import type {
  ConversationSession,
  SessionMessage,
  SessionRequest,
  MessageRequest,
  MessageRole,
  ProjectContext,
} from "@/types/entities";
import type {
  SessionMessage as ACPSessionMessage,
  MessageContent as ACPMessageContent,
  PromptResponse,
  SessionUpdateNotification,
  ToolCall,
  ToolCallUpdate,
  PlanUpdate,
  AvailableCommandsUpdate,
  CurrentModeUpdate,
  ToolCallContent,
  ContentBlock,
  ToolCallStatus,
} from "@/types/acp";
import type { AgentConfig, SessionServiceInterface } from "@/types/extension";
import type { StorageService } from "./storageService";
import type { ACPClient } from "./acpClient";
import { ContextService } from "./contextService";
import { PersistenceService } from "./persistenceService";

const logger = createLogger("SessionService");

export class SessionService implements SessionServiceInterface {
  private contextService: ContextService;

  private persistenceService: PersistenceService;

  private activeStreamingMessages: Map<string, Partial<Record<"assistant" | "user", { id: string; content: string }>>> =
    new Map();

  constructor(
    private storageService: StorageService,
    private acpClient: ACPClient,
    contextService?: ContextService,
    persistenceService?: PersistenceService,
  ) {
    this.contextService = contextService ?? new ContextService();
    this.persistenceService = persistenceService ?? new PersistenceService(this.storageService);

    if (typeof this.acpClient.registerSessionUpdateListener === "function") {
      this.acpClient.registerSessionUpdateListener((update) => {
        return this.handleSessionUpdate(update);
      });
    }
  }

  private sessionObservers: Map<string, (message: SessionMessage) => void> = new Map();
  private pendingUpdates: Map<string, SessionUpdateNotification[]> = new Map();

  onSessionMessage(sessionId: string, handler: (message: SessionMessage) => void): void {
    this.sessionObservers.set(sessionId, handler);
  }

  offSessionMessage(sessionId: string): void {
    this.sessionObservers.delete(sessionId);
  }

  /**
   * Create a new conversation session
   */
  async createSession(request: SessionRequest): Promise<ConversationSession> {
    const operationId = `createSession-${request.agentConnectionId}`;
    PerformanceLogger.start(operationId);

    try {
      if (!request.agentConfigId) {
        throw new ACPError(
          ErrorCode.InvalidConfiguration,
          "Agent configuration ID is required to create a session",
          "No agent configuration was provided for session creation",
        );
      }

      logger.info("Creating new session", {
        agentConnectionId: request.agentConnectionId,
        promptLength: request.prompt.length,
      });

      // Generate session ID
      const sessionId = uuidv4();

      // Create initial user message
      const userMessage: SessionMessage = {
        id: uuidv4(),
        role: "user",
        content: request.prompt,
        timestamp: new Date(),
        metadata: {
          source: "user",
          messageType: "text",
          sequence: 0,
        },
      };

      // Create session object
      const session: ConversationSession = {
        sessionId,
        agentConnectionId: request.agentConnectionId,
        agentConfigId: request.agentConfigId,
        status: "active",
        createdAt: new Date(),
        lastActivity: new Date(),
        messages: [userMessage],
        metadata: {
          title: this.generateSessionTitle(request.prompt),
          tags: request.metadata?.tags || [],
          priority: request.metadata?.priority || "normal",
        },
        context: {
          ...request.context,
          additionalContext: {
            ...(request.context?.additionalContext ?? {}),
          },
        },
      };

      // Send initial prompt to agent via ACP
      try {
        const acpSession = await this.acpClient.createSession({
          cwd: request.context?.workingDirectory ?? process.cwd(),
        });

        await this.acpClient.sendPrompt(acpSession.sessionId, request.prompt);

        // Note: Agent responses come via sessionUpdate callbacks, not in the prompt response
        // The prompt response just indicates the request was accepted

        session.agentSessionId = acpSession.sessionId;
        session.context = {
          ...session.context,
          additionalContext: {
            ...(session.context?.additionalContext ?? {}),
            agentSessionId: acpSession.sessionId,
          },
        };

        // Capture mode information if provided by the agent
        if (acpSession.modes) {
          const currentMode = acpSession.modes.availableModes.find((m) => m.id === acpSession.modes!.currentModeId);

          session.currentMode = currentMode
            ? {
                id: currentMode.id,
                name: currentMode.name,
              }
            : undefined;

          session.availableModes = acpSession.modes.availableModes;

          logger.info("Agent mode information captured", {
            sessionId,
            currentMode: session.currentMode,
            availableModes: session.availableModes,
          });
        }

        logger.info("Session created successfully", {
          sessionId,
          messageCount: session.messages.length,
        });
      } catch (error) {
        logger.error("Failed to create ACP session", {
          sessionId,
          agentConnectionId: request.agentConnectionId,
          error,
        });

        throw new ACPError(
          ErrorCode.ProtocolError,
          "Failed to create session with agent",
          error instanceof Error ? error.message : "Unknown ACP error",
          { sessionId, agentConnectionId: request.agentConnectionId },
        );
      }

      // Save session to storage BEFORE processing pending updates
      // This ensures the session exists when processPendingUpdates tries to find it
      try {
        await this.storageService.saveConversation(session);
        await this.persistenceService.saveSessionSnapshot(session);

        logger.info("Session saved to storage", { sessionId });

        // Process any buffered updates that arrived while session was being created
        // Now that the session is saved, these updates can be properly applied
        await this.processPendingUpdates(session.agentSessionId!, sessionId);

        PerformanceLogger.end(operationId, {
          success: true,
          sessionId,
          messageCount: session.messages.length,
        });

        return session;
      } catch (error) {
        logger.error("Failed to save session to storage", { sessionId, error });

        throw new ACPError(
          ErrorCode.SystemError,
          "Failed to save session",
          error instanceof Error ? error.message : "Storage error",
          { sessionId },
        );
      }
    } catch (error) {
      PerformanceLogger.end(operationId, {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get an existing session
   */
  async getSession(sessionId: string): Promise<ConversationSession | null> {
    try {
      logger.debug("Retrieving session", { sessionId });

      const session = await this.storageService.getConversation(sessionId);

      if (session) {
        logger.debug("Session retrieved successfully", {
          sessionId,
          messageCount: session.messages.length,
          status: session.status,
        });
      } else {
        logger.debug("Session not found", { sessionId });
      }

      return session;
    } catch (error) {
      logger.error("Failed to retrieve session", { sessionId, error });

      throw new ACPError(
        ErrorCode.SystemError,
        "Failed to retrieve session",
        error instanceof Error ? error.message : "Storage error",
        { sessionId },
      );
    }
  }

  /**
   * End a conversation session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      logger.info("Ending session", { sessionId });

      // Get existing session
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new ACPError(
          ErrorCode.SessionNotFound,
          `Session not found: ${sessionId}`,
          "Cannot end a session that does not exist",
          { sessionId },
        );
      }

      // End session via ACP
      try {
        await this.acpClient.endSession(sessionId);
        logger.debug("ACP session ended", { sessionId });
      } catch (error) {
        logger.warn("Failed to end ACP session", { sessionId, error });
        // Continue with local cleanup even if ACP fails
      }

      // Update session status
      session.status = "completed";
      session.lastActivity = new Date();

      // Save updated session and clear active tracking
      await this.storageService.saveConversation(session);
      await this.persistenceService.markSessionCompleted(sessionId);

      logger.info("Session ended successfully", { sessionId });
    } catch (error) {
      if (error instanceof ACPError) {
        throw error;
      }

      logger.error("Failed to end session", { sessionId, error });

      throw new ACPError(
        ErrorCode.SystemError,
        "Failed to end session",
        error instanceof Error ? error.message : "Unknown error",
        { sessionId },
      );
    }
  }

  /**
   * Send a message in an existing session
   */
  async sendMessage(
    sessionId: string,
    content: string,
    agentConfig: AgentConfig,
    context?: MessageRequest["context"],
  ): Promise<SessionMessage> {
    const operationId = `sendMessage-${sessionId}`;
    PerformanceLogger.start(operationId);

    try {
      logger.info("Sending message", {
        sessionId,
        contentLength: content.length,
        hasContext: !!context,
      });

      // Get and validate session
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new ACPError(
          ErrorCode.SessionNotFound,
          `Session not found: ${sessionId}`,
          "Cannot send message to a session that does not exist",
          { sessionId },
        );
      }

      if (!session.agentConfigId) {
        session.agentConfigId = agentConfig.id;
      }

      if (session.agentConfigId !== agentConfig.id) {
        throw new ACPError(
          ErrorCode.InvalidConfiguration,
          `Session is associated with a different agent configuration (${session.agentConfigId})`,
          "Please reopen the conversation using the original agent",
          { sessionId, expectedAgent: session.agentConfigId, providedAgent: agentConfig.id },
        );
      }

      this.markStreamingComplete(session, "assistant");

      if (session.status !== "active") {
        throw new ACPError(
          ErrorCode.InvalidSession,
          `Session is not active: ${session.status}`,
          "Cannot send messages to inactive sessions",
          { sessionId, status: session.status },
        );
      }

      // Create user message
      const userMessage: SessionMessage = {
        id: uuidv4(),
        role: "user",
        content,
        timestamp: new Date(),
        metadata: {
          source: "user",
          messageType: "text",
          sequence: session.messages.length,
        },
      };

      // Add user message to session
      const historyBeforeNewMessage = [...session.messages];

      session.messages.push(userMessage);
      session.lastActivity = new Date();

      // Save user message
      await this.persistenceService.recordMessage(sessionId, userMessage);

      const contexts = await this.contextService.getSessionContext(sessionId);

      // Send message to agent via ACP
      let promptResponse: PromptResponse;
      let agentMessages: SessionMessage[] = [];
      let agentSessionId = session.agentSessionId;
      let retriedWithNewSession = false;
      try {
        let includeHistoryInPrompt = false;

        if (!agentSessionId) {
          const newAgentSession = await this.acpClient.createSession({
            cwd: session.context?.workingDirectory ?? process.cwd(),
          });
          agentSessionId = newAgentSession.sessionId;
          session.agentSessionId = agentSessionId;
          session.context = {
            ...session.context,
            additionalContext: {
              ...(session.context?.additionalContext ?? {}),
              agentSessionId,
            },
          };

          // Capture mode information if provided
          if (newAgentSession.modes) {
            const currentMode = newAgentSession.modes.availableModes.find(
              (m) => m.id === newAgentSession.modes!.currentModeId,
            );
            session.currentMode = currentMode
              ? {
                  id: currentMode.id,
                  name: currentMode.name,
                }
              : undefined;
            session.availableModes = newAgentSession.modes.availableModes;
          }

          await this.storageService.saveConversation(session);
          await this.persistenceService.saveSessionSnapshot(session);

          includeHistoryInPrompt = true;
        }

        const promptPayload = this.buildPromptPayload({
          history: includeHistoryInPrompt ? historyBeforeNewMessage : undefined,
          message: content,
          contexts,
        });

        promptResponse = await this.acpClient.sendPrompt(agentSessionId, promptPayload);

        logger.debug("Prompt response received", {
          sessionId,
          stopReason: promptResponse.stopReason,
          fullPromptResponse: JSON.stringify(promptResponse, null, 2),
        });

        // Note: Agent responses come via sessionUpdate callbacks, not in the prompt response
        // We'll receive updates through the streaming mechanism
        agentMessages = [];

        logger.info("Prompt sent successfully, waiting for streaming updates", {
          sessionId,
          stopReason: promptResponse.stopReason,
        });
      } catch (error) {
        const details =
          typeof error === "object" && error !== null && "details" in (error as Record<string, unknown>)
            ? String((error as Record<string, unknown>).details)
            : "";

        const sessionNotFound = details.includes("Session not found");

        if (sessionNotFound && !retriedWithNewSession) {
          logger.warn("Agent session missing, creating new ACP session", {
            sessionId,
            agentConfigId: agentConfig.id,
          });

          const newAgentSession = await this.acpClient.createSession({
            cwd: session.context?.workingDirectory ?? process.cwd(),
          });

          agentSessionId = newAgentSession.sessionId;
          session.agentSessionId = agentSessionId;
          session.context = {
            ...session.context,
            additionalContext: {
              ...(session.context?.additionalContext ?? {}),
              agentSessionId,
            },
          };

          // Capture mode information if provided
          if (newAgentSession.modes) {
            const currentMode = newAgentSession.modes.availableModes.find(
              (m) => m.id === newAgentSession.modes!.currentModeId,
            );
            session.currentMode = currentMode
              ? {
                  id: currentMode.id,
                  name: currentMode.name,
                }
              : undefined;
            session.availableModes = newAgentSession.modes.availableModes;
          }

          await this.storageService.saveConversation(session);
          await this.persistenceService.saveSessionSnapshot(session);

          // When creating a new session, we need to send history since this is a fresh session
          // Build the full conversation context for the new session
          const retryPrompt = this.buildPromptPayload({
            history: historyBeforeNewMessage,
            message: content,
            contexts,
          });
          promptResponse = await this.acpClient.sendPrompt(agentSessionId, retryPrompt);

          // Responses come via sessionUpdate callbacks
          agentMessages = [];
          retriedWithNewSession = true;

          logger.info("Prompt sent after session renewal, waiting for updates", {
            sessionId,
          });
        } else {
          logger.error("Failed to send message to agent", { sessionId, error });

          throw new ACPError(
            ErrorCode.ProtocolError,
            "Failed to send message to agent",
            error instanceof Error ? error.message : "ACP communication error",
            { sessionId, messageId: userMessage.id },
          );
        }
      }

      // Add agent response to session
      if (agentMessages.length === 0) {
        logger.info("No synchronous agent messages returned; awaiting streaming updates", { sessionId });
      } else {
        for (const agentMessage of agentMessages) {
          agentMessage.metadata.sequence = session.messages.length;
          session.messages.push(agentMessage);
          session.lastActivity = new Date();
          await this.persistenceService.recordMessage(sessionId, agentMessage);
        }
      }

      logger.info("Message exchange completed", {
        sessionId,
        userMessageId: userMessage.id,
        agentMessageIds: agentMessages.map((msg) => msg.id),
      });

      const latestSession = await this.storageService.getConversation(sessionId);
      if (latestSession) {
        await this.persistenceService.saveSessionSnapshot(latestSession);
      } else {
        await this.persistenceService.saveSessionSnapshot(session);
      }

      PerformanceLogger.end(operationId, {
        success: true,
        sessionId,
        messageCount: session.messages.length,
        responseTime: agentMessages.at(-1)?.metadata.processingTime,
      });

      return agentMessages.at(-1)!;
    } catch (error) {
      PerformanceLogger.end(operationId, {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get messages from a session with pagination
   */
  async getSessionMessages(sessionId: string, offset: number, limit: number): Promise<SessionMessage[]> {
    try {
      logger.debug("Getting session messages", { sessionId, offset, limit });

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new ACPError(
          ErrorCode.SessionNotFound,
          `Session not found: ${sessionId}`,
          "Cannot retrieve messages from a session that does not exist",
          { sessionId },
        );
      }

      // Apply pagination
      const startIndex = Math.max(0, offset);
      const endIndex = Math.min(session.messages.length, startIndex + limit);
      const messages = session.messages.slice(startIndex, endIndex);

      logger.debug("Session messages retrieved", {
        sessionId,
        totalMessages: session.messages.length,
        returnedMessages: messages.length,
        offset,
        limit,
      });

      return messages;
    } catch (error) {
      if (error instanceof ACPError) {
        throw error;
      }

      logger.error("Failed to get session messages", { sessionId, error });

      throw new ACPError(
        ErrorCode.SystemError,
        "Failed to retrieve session messages",
        error instanceof Error ? error.message : "Unknown error",
        { sessionId },
      );
    }
  }

  /**
   * Switch the mode for an active session
   */
  async setSessionMode(sessionId: string, modeId: string): Promise<void> {
    try {
      logger.info("Setting session mode", { sessionId, modeId });

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new ACPError(
          ErrorCode.SessionNotFound,
          `Session not found: ${sessionId}`,
          "Cannot set mode for a session that does not exist",
          { sessionId },
        );
      }

      if (!session.agentSessionId) {
        throw new ACPError(
          ErrorCode.InvalidSession,
          `Session has no agent session ID`,
          "Cannot set mode for a session without an active agent connection",
          { sessionId },
        );
      }

      // Check if the mode is available
      if (session.availableModes) {
        const modeExists = session.availableModes.some((m) => m.id === modeId);
        if (!modeExists) {
          throw new ACPError(
            ErrorCode.InvalidConfiguration,
            `Mode '${modeId}' is not available for this session`,
            `Available modes: ${session.availableModes.map((m) => m.id).join(", ")}`,
            { sessionId, modeId, availableModes: session.availableModes },
          );
        }
      }

      // Call the ACP client to set the mode
      await this.acpClient.setSessionMode({
        sessionId: session.agentSessionId,
        modeId,
      });

      logger.info("Session mode change requested", { sessionId, modeId });
      // Note: The actual mode update will come via current_mode_update notification
    } catch (error) {
      if (error instanceof ACPError) {
        throw error;
      }

      logger.error("Failed to set session mode", { sessionId, modeId, error });

      throw new ACPError(
        ErrorCode.SystemError,
        "Failed to set session mode",
        error instanceof Error ? error.message : "Unknown error",
        { sessionId, modeId },
      );
    }
  }

  /**
   * Get the current mode and available modes for a session
   */
  async getSessionMode(sessionId: string): Promise<{
    currentMode?: { id: string; name: string };
    availableModes?: Array<{ id: string; name: string; description?: string | null }>;
  }> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new ACPError(
          ErrorCode.SessionNotFound,
          `Session not found: ${sessionId}`,
          "Cannot get mode for a session that does not exist",
          { sessionId },
        );
      }

      return {
        currentMode: session.currentMode,
        availableModes: session.availableModes,
      };
    } catch (error) {
      if (error instanceof ACPError) {
        throw error;
      }

      logger.error("Failed to get session mode", { sessionId, error });

      throw new ACPError(
        ErrorCode.SystemError,
        "Failed to get session mode",
        error instanceof Error ? error.message : "Unknown error",
        { sessionId },
      );
    }
  }

  /**
   * Validate that a session is active and accessible
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      logger.debug("Validating session", { sessionId });

      // Check if session exists locally
      const session = await this.getSession(sessionId);
      if (!session) {
        logger.debug("Session validation failed: not found", { sessionId });
        return false;
      }

      if (session.status !== "active") {
        logger.debug("Session validation failed: not active", {
          sessionId,
          status: session.status,
        });
        return false;
      }

      // Check if the underlying connection is still healthy
      try {
        const isConnectionHealthy = await this.acpClient.checkConnection(session.agentConnectionId);

        if (!isConnectionHealthy) {
          logger.debug("Session validation failed: connection unhealthy", {
            sessionId,
            agentConnectionId: session.agentConnectionId,
          });
          return false;
        }
      } catch (error) {
        logger.debug("Session validation failed: connection check error", {
          sessionId,
          error,
        });
        return false;
      }

      logger.debug("Session validation successful", { sessionId });
      return true;
    } catch (error) {
      logger.warn("Session validation error", { sessionId, error });
      return false;
    }
  }

  /**
   * Generate a human-readable title for a session based on the initial prompt
   */
  private generateSessionTitle(prompt: string): string {
    // Take first 50 characters and clean up
    let title = prompt.trim().substring(0, 50);

    // Remove newlines and extra spaces
    title = title.replace(/\s+/g, " ");

    // Add ellipsis if truncated
    if (prompt.length > 50) {
      title += "...";
    }

    // Fallback if empty
    if (!title.trim()) {
      title = "New Conversation";
    }

    return title;
  }

  private transformAcpMessage(message: ACPSessionMessage, sequence: number): SessionMessage {
    const { text, messageType } = this.flattenAcpContent(message.content);

    return {
      id: message.id,
      role: this.mapAcpRole(message.type),
      content: text,
      timestamp: new Date(message.timestamp),
      metadata: {
        source: this.mapAcpSource(message.type),
        messageType,
        sequence,
        tokenCount: message.metadata?.tokensUsed,
        processingTime: message.metadata?.processingTime,
        isStreaming: false,
      },
    };
  }

  private flattenAcpContent(contents: Array<ACPMessageContent | ContentBlock | null | undefined>): {
    text: string;
    messageType: SessionMessage["metadata"]["messageType"];
  } {
    let messageType: SessionMessage["metadata"]["messageType"] = "text";
    const parts: string[] = [];

    for (const rawContent of contents) {
      if (!rawContent) {
        continue;
      }

      if (this.isContentWrapper(rawContent)) {
        const rendered = this.renderContentBlock(rawContent.content);
        if (rendered) {
          parts.push(rendered);
        }
        messageType = this.deriveMessageTypeFromBlock(rawContent.content, messageType);
        continue;
      }

      if (this.isContentBlock(rawContent)) {
        const rendered = this.renderContentBlock(rawContent);
        if (rendered) {
          parts.push(rendered);
        }
        messageType = this.deriveMessageTypeFromBlock(rawContent, messageType);
        continue;
      }

      const content = rawContent as ACPMessageContent;
      switch (content.type) {
        case "text":
          if (typeof content.text === "string") {
            parts.push(content.text);
          }
          break;
        case "code":
          if ("code" in content && typeof content.code === "string") {
            parts.push(content.code);
            messageType = messageType === "text" ? "code" : messageType;
          }
          break;
        case "file": {
          const fileRecord = content as Record<string, unknown>;
          const label =
            typeof content.filename === "string"
              ? content.filename
              : typeof fileRecord.path === "string"
                ? (fileRecord.path as string)
                : "File";
          const body =
            typeof content.content === "string"
              ? content.content
              : typeof fileRecord.text === "string"
                ? (fileRecord.text as string)
                : "";
          parts.push(`${label}: ${body}`.trim());
          messageType = messageType === "text" ? "file" : messageType;
          break;
        }
        case "error":
          if ("error" in content && typeof content.error === "string") {
            parts.push(`Error: ${content.error}`);
          }
          break;
        default: {
          const fallback = this.stringifyUnknownContent(content as Record<string, unknown>);
          if (fallback) {
            parts.push(fallback);
          }
          break;
        }
      }
    }

    const text = parts.length > 1 ? parts.join("\n\n") : (parts[0] ?? "");

    return {
      text,
      messageType,
    };
  }

  private mergeStreamingContent(previousContent: string, incomingContent: string): string {
    if (!previousContent) {
      return incomingContent;
    }

    if (!incomingContent) {
      return previousContent;
    }

    if (incomingContent === previousContent) {
      return previousContent;
    }

    if (incomingContent.startsWith(previousContent)) {
      return incomingContent;
    }

    if (previousContent.endsWith(incomingContent)) {
      return previousContent;
    }

    const maxOverlap = Math.min(previousContent.length, incomingContent.length);
    for (let overlap = maxOverlap; overlap > 0; overlap--) {
      if (previousContent.endsWith(incomingContent.slice(0, overlap))) {
        return previousContent + incomingContent.slice(overlap);
      }
    }

    const previousLastChar = previousContent.slice(-1);
    const incomingFirstChar = incomingContent[0];

    const needsSpace =
      !!previousLastChar &&
      !!incomingFirstChar &&
      !/\s/.test(previousLastChar) &&
      !/\s/.test(incomingFirstChar) &&
      !previousContent.endsWith("\n") &&
      /[.!?:;,)\]]/.test(previousLastChar) &&
      /[A-Za-z0-9]/.test(incomingFirstChar);

    return needsSpace ? `${previousContent} ${incomingContent}` : `${previousContent}${incomingContent}`;
  }

  private getStreamingState(sessionId: string): Partial<Record<"assistant" | "user", { id: string; content: string }>> {
    let state = this.activeStreamingMessages.get(sessionId);
    if (!state) {
      state = {};
      this.activeStreamingMessages.set(sessionId, state);
    }
    return state;
  }

  private markStreamingComplete(session: ConversationSession, role: "assistant" | "user"): void {
    const state = this.activeStreamingMessages.get(session.sessionId);
    if (!state) {
      return;
    }

    const entry = state[role];
    if (!entry) {
      return;
    }

    const target = session.messages.find((message) => message.id === entry.id);
    if (target) {
      target.metadata.isStreaming = false;
    }

    delete state[role];

    if (!state.assistant && !state.user) {
      this.activeStreamingMessages.delete(session.sessionId);
    }
  }

  private flattenToolCallContent(contents?: ToolCallContent[] | null): string {
    logger.debug("flattenToolCallContent called", {
      contentsNull: contents === null,
      contentsUndefined: contents === undefined,
      contentsLength: contents?.length || 0,
      contents: JSON.stringify(contents, null, 2),
    });

    if (!contents || contents.length === 0) {
      logger.debug("flattenToolCallContent returning empty - no contents");
      return "";
    }

    const parts: string[] = [];

    for (const item of contents) {
      logger.debug("Processing tool call content item", {
        itemType: item.type,
        item: JSON.stringify(item, null, 2),
      });

      switch (item.type) {
        case "content": {
          const renderedContent = this.renderContentBlock(item.content);
          logger.debug("Rendered content block", {
            contentType: item.content.type,
            renderedLength: renderedContent.length,
            rendered: renderedContent,
          });
          parts.push(renderedContent);
          break;
        }
        case "diff": {
          const diffContent = `Diff (${item.path}):\n${item.newText}`;
          logger.debug("Rendered diff content", {
            path: item.path,
            newTextLength: item.newText?.length || 0,
            diffContentLength: diffContent.length,
            diffContent,
          });
          parts.push(diffContent);
          break;
        }
        case "terminal": {
          const terminalContent = `Terminal output available (id: ${item.terminalId})`;
          logger.debug("Rendered terminal content", {
            terminalId: item.terminalId,
            terminalContent,
          });
          parts.push(terminalContent);
          break;
        }
        default: {
          const unknownItem = item as { type?: unknown };
          logger.debug("Unknown tool call content type", {
            type: typeof unknownItem.type === "string" ? unknownItem.type : "unknown",
            item: JSON.stringify(item, null, 2),
          });
          break;
        }
      }
    }

    const result = parts.join("\n\n").trim();
    logger.debug("flattenToolCallContent result", {
      partsCount: parts.length,
      resultLength: result.length,
      result,
    });

    return result;
  }

  private renderContentBlock(block: ContentBlock): string {
    if (!block || typeof block !== "object") {
      return "";
    }

    switch (block.type) {
      case "text":
        return typeof block.text === "string" ? block.text : "";
      case "image": {
        const uriPart = typeof block.uri === "string" && block.uri.length > 0 ? ` (${block.uri})` : "";
        return `[Image ${block.mimeType}${uriPart}]`;
      }
      case "audio":
        return `[Audio ${block.mimeType}]`;
      case "resource_link": {
        const name = "name" in block && typeof block.name === "string" ? block.name : "Resource";
        return `[Resource Link] ${name} → ${block.uri}`;
      }
      case "resource": {
        try {
          return JSON.stringify(block.resource);
        } catch {
          return "[Resource]";
        }
      }
      default: {
        // Try to extract meaningful content from unknown block types
        const blockRecord = block as Record<string, unknown>;

        // Common content fields to check
        const contentFields = ["text", "content", "output", "result", "message", "data"];
        for (const field of contentFields) {
          if (field in blockRecord && typeof blockRecord[field] === "string" && blockRecord[field]) {
            return blockRecord[field] as string;
          }
        }

        // If it has a meaningful structure, show it
        try {
          const jsonStr = JSON.stringify(block, null, 2);
          // Don't show empty objects or just type fields
          if (jsonStr !== "{}" && !jsonStr.match(/^\s*\{\s*"type"\s*:\s*"[^"]*"\s*\}\s*$/)) {
            return jsonStr;
          }
        } catch {
          // ignore
        }

        return `[${block.type || "Unknown"} content]`;
      }
    }
  }

  private formatToolStatus(status?: ToolCallStatus | null): string {
    if (!status) {
      return "";
    }
    return status.replace(/_/g, " ");
  }

  private isContentBlock(value: unknown): value is ContentBlock {
    if (!value || typeof value !== "object") {
      return false;
    }
    const type = (value as { type?: unknown }).type;
    if (typeof type !== "string") {
      return false;
    }
    return ["text", "image", "audio", "resource_link", "resource"].includes(type);
  }

  private isContentWrapper(value: unknown): value is { type: "content"; content: ContentBlock } {
    if (!value || typeof value !== "object") {
      return false;
    }
    const record = value as { type?: unknown; content?: unknown };
    return record.type === "content" && this.isContentBlock(record.content);
  }

  private deriveMessageTypeFromBlock(
    block: ContentBlock,
    current: SessionMessage["metadata"]["messageType"],
  ): SessionMessage["metadata"]["messageType"] {
    switch (block.type) {
      case "text":
        return current;
      case "image":
      case "audio":
      case "resource":
      case "resource_link":
        return current === "text" ? "file" : current;
      default:
        return current;
    }
  }

  private stringifyUnknownContent(content: Record<string, unknown>): string {
    try {
      return JSON.stringify(content);
    } catch {
      return "";
    }
  }

  private stringifyRawOutput(raw?: Record<string, unknown> | string | number | boolean | null): string | null {
    if (raw === undefined || raw === null) {
      return null;
    }

    if (typeof raw === "string") {
      return raw.trim() || null;
    }

    if (typeof raw === "number" || typeof raw === "boolean") {
      return String(raw);
    }

    // Handle Error objects specifically
    if (raw instanceof Error) {
      return raw.message || raw.toString();
    }

    // Handle arrays
    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        return null;
      }
      try {
        return raw.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("\n");
      } catch {
        return String(raw);
      }
    }

    // Handle objects
    if (typeof raw === "object") {
      // Check for error-like objects first
      if ("message" in raw && typeof raw.message === "string") {
        return raw.message.trim() || null;
      }
      if ("error" in raw && typeof raw.error === "string") {
        return raw.error.trim() || null;
      }
      if ("details" in raw && typeof raw.details === "string") {
        return raw.details.trim() || null;
      }

      // Check for common output patterns
      if ("output" in raw && typeof raw.output === "string") {
        return raw.output.trim() || null;
      }
      if ("result" in raw && typeof raw.result === "string") {
        return raw.result.trim() || null;
      }
      if ("content" in raw && typeof raw.content === "string") {
        return raw.content.trim() || null;
      }
      if ("text" in raw && typeof raw.text === "string") {
        return raw.text.trim() || null;
      }

      // If it's an empty object, return null
      if (Object.keys(raw).length === 0) {
        return null;
      }

      try {
        // Use a replacer function to handle circular references and other issues
        const jsonString = JSON.stringify(
          raw,
          (key, value) => {
            // Handle circular references
            if (typeof value === "object" && value !== null) {
              if (value instanceof Error) {
                return {
                  name: value.name,
                  message: value.message,
                  stack: value.stack,
                };
              }
              // Handle other special object types
              if (value.constructor && value.constructor.name !== "Object") {
                return `[${value.constructor.name}]`;
              }
            }
            return value;
          },
          2,
        );
        return jsonString === "{}" ? null : jsonString;
      } catch (error) {
        logger.debug("JSON stringification failed, falling back to toString", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Fallback to toString or a descriptive message
        try {
          return raw.toString();
        } catch {
          return "[Complex Object]";
        }
      }
    }

    try {
      return JSON.stringify(
        raw,
        (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (value instanceof Error) {
              return {
                name: value.name,
                message: value.message,
                stack: value.stack,
              };
            }
          }
          return value;
        },
        2,
      );
    } catch {
      try {
        return String(raw);
      } catch {
        return "[Unstringifiable Object]";
      }
    }
  }

  private mapAcpRole(role: ACPSessionMessage["type"]): MessageRole {
    switch (role) {
      case "user":
        return "user";
      case "agent":
        return "assistant";
      case "system":
        return "system";
      default:
        return "system";
    }
  }

  private mapAcpSource(role: ACPSessionMessage["type"]): SessionMessage["metadata"]["source"] {
    switch (role) {
      case "user":
        return "user";
      case "agent":
        return "agent";
      default:
        return "system";
    }
  }

  private buildPromptPayload({
    history,
    message,
    contexts,
  }: {
    history?: SessionMessage[];
    message: string;
    contexts?: ProjectContext[];
  }): string {
    const sections: string[] = [];

    if (history && history.length > 0) {
      const historyLines = history
        .map((entry) => {
          const sender = entry.role === "user" ? "User" : entry.role === "assistant" ? "Assistant" : "System";
          return `${sender}: ${entry.content}`;
        })
        .join("\n");

      sections.push(`Conversation history:\n${historyLines}`);
    }

    if (contexts && contexts.length > 0) {
      sections.push(this.formatContextsForPrompt(contexts));
    }

    sections.push(`User: ${message}`);

    return sections.filter(Boolean).join("\n\n");
  }

  private formatContextsForPrompt(contexts: ProjectContext[]): string {
    const lines: string[] = ["Shared project context:"];

    contexts.forEach((ctx, index) => {
      const contextLines: string[] = [];

      contextLines.push(
        `Context ${index + 1}: ${ctx.path}`,
        `Type: ${ctx.type}${ctx.language ? ` | Language: ${ctx.language}` : ""}`,
      );

      if (ctx.metadata?.lineRange) {
        contextLines.push(`Line range: ${ctx.metadata.lineRange.start}-${ctx.metadata.lineRange.end}`);
      }

      if (ctx.metadata?.isTruncated) {
        contextLines.push("Note: Content truncated for size limits.");
      }

      if (ctx.content) {
        contextLines.push(ctx.content);
      } else {
        contextLines.push("(no content provided)");
      }

      lines.push(contextLines.join("\n"), "");
    });

    return lines.join("\n").trimEnd();
  }

  /**
   * Process buffered updates that arrived before session was saved
   */
  private async processPendingUpdates(agentSessionId: string, conversationSessionId: string): Promise<void> {
    const bufferedUpdates = this.pendingUpdates.get(agentSessionId);
    if (!bufferedUpdates || bufferedUpdates.length === 0) {
      return;
    }

    logger.info("Processing buffered session updates", {
      agentSessionId,
      conversationSessionId,
      updateCount: bufferedUpdates.length,
    });

    // Remove from buffer
    this.pendingUpdates.delete(agentSessionId);

    // Process each update with the correct session ID
    for (const update of bufferedUpdates) {
      const correctedUpdate: SessionUpdateNotification = {
        ...update,
        sessionId: conversationSessionId,
      };

      logger.debug("Processing buffered update", {
        originalSessionId: update.sessionId,
        correctedSessionId: conversationSessionId,
        updateType: update.update?.sessionUpdate,
      });

      await this.handleSessionUpdate(correctedUpdate);
    }

    // Notify observers that buffered updates have been processed
    const observer = this.sessionObservers.get(conversationSessionId);
    if (observer && bufferedUpdates.length > 0) {
      logger.debug("Notifying observer after processing buffered updates", {
        conversationSessionId,
        updateCount: bufferedUpdates.length,
      });

      // Get the last processed message to trigger UI refresh
      const session = await this.storageService.getConversation(conversationSessionId);
      if (session && session.messages.length > 0) {
        const lastMessage = session.messages[session.messages.length - 1];
        observer(lastMessage);
      }
    }
  }

  private async handleSessionUpdate(update: SessionUpdateNotification): Promise<void> {
    const sessionId = update.sessionId;

    logger.debug("Session update received", {
      sessionId,
      updateType: update.update?.sessionUpdate,
      updateData: JSON.stringify(update.update, null, 2),
    });

    // Handle current_mode_update specially before loading the session
    if (update.update?.sessionUpdate === "current_mode_update") {
      const modeChange = update.update as CurrentModeUpdate;
      const session = await this.storageService.getConversation(sessionId);

      if (session && session.availableModes) {
        const newMode = session.availableModes.find((m) => m.id === modeChange.currentModeId);
        if (newMode) {
          session.currentMode = {
            id: newMode.id,
            name: newMode.name,
          };
          await this.storageService.saveConversation(session);

          logger.info("Session mode updated", {
            sessionId,
            newMode: session.currentMode,
          });
        }
      }
    }

    const session = await this.storageService.getConversation(sessionId);
    if (!session) {
      logger.warn("Session not found for update", {
        sessionId,
        updateType: update.update?.sessionUpdate,
      });

      // Try to find any session that might match - sometimes session IDs don't match exactly
      const allConversations = await this.storageService.getConversations();
      logger.debug("Available sessions when update failed", {
        requestedSessionId: sessionId,
        availableSessions: allConversations.map((conv) => ({
          sessionId: conv.sessionId,
          agentSessionId: conv.agentSessionId,
          status: conv.status,
          messageCount: conv.messages.length,
        })),
      });

      // Try to match by agent session ID for any session update type
      if (update.update?.sessionUpdate) {
        for (const conv of allConversations) {
          if (conv.agentSessionId === sessionId || conv.context?.additionalContext?.agentSessionId === sessionId) {
            logger.info("Found matching session by agent session ID", {
              originalSessionId: sessionId,
              matchedConversationId: conv.sessionId,
              updateType: update.update.sessionUpdate,
            });

            // Recursively call with correct session ID
            const correctedUpdate: SessionUpdateNotification = {
              ...update,
              sessionId: conv.sessionId,
            };
            await this.handleSessionUpdate(correctedUpdate);
            return;
          }
        }
      }

      // Buffer the update for later processing when session becomes available
      logger.info("Buffering session update for later processing", {
        agentSessionId: sessionId,
        updateType: update.update?.sessionUpdate,
      });

      if (!this.pendingUpdates.has(sessionId)) {
        this.pendingUpdates.set(sessionId, []);
      }
      this.pendingUpdates.get(sessionId)!.push(update);

      // Clean up old buffers (older than 30 seconds)
      setTimeout(() => {
        const buffer = this.pendingUpdates.get(sessionId);
        if (buffer) {
          const remainingUpdates = buffer.filter((u) => u !== update);
          if (remainingUpdates.length === 0) {
            this.pendingUpdates.delete(sessionId);
          } else {
            this.pendingUpdates.set(sessionId, remainingUpdates);
          }
        }
      }, 30000);

      return;
    }

    const message = this.transformSessionUpdate(update, session.messages.length);
    if (!message) {
      logger.debug("No message produced from session update", {
        sessionId,
        updateType: update.update?.sessionUpdate,
      });
      return;
    }

    logger.debug("Session update transformed to message", {
      sessionId,
      messageId: message.id,
      messageRole: message.role,
      contentLength: message.content?.length || 0,
      contentPreview: message.content?.slice(0, 200) || "empty",
    });

    let notificationTarget: SessionMessage = message;
    let messageUpdated = false;
    let forceFullSave = false;
    const streamingState = this.getStreamingState(sessionId);
    const roleKey = message.role === "assistant" || message.role === "user" ? message.role : null;

    // For tool calls, update existing message by tool call ID
    if (message.role === "tool" && message.toolCall?.callId) {
      const existingIndex = session.messages.findIndex(
        (m) => m.role === "tool" && m.toolCall?.callId === message.toolCall!.callId,
      );

      if (existingIndex >= 0) {
        logger.debug("Updating existing tool call message", {
          sessionId,
          toolCallId: message.toolCall.callId,
          existingMessageId: session.messages[existingIndex].id,
          newContentLength: message.content.length,
        });

        // Update the existing tool call message
        session.messages[existingIndex] = {
          ...session.messages[existingIndex],
          content: message.content,
          timestamp: message.timestamp,
          metadata: {
            ...session.messages[existingIndex].metadata,
            ...message.metadata,
          },
          toolCall: message.toolCall,
          toolResult: message.toolResult,
        };

        notificationTarget = session.messages[existingIndex];
        messageUpdated = true;
      }
    }

    if (update.update?.sessionUpdate === "available_commands_update") {
      const commandsUpdate = update.update as AvailableCommandsUpdate;
      session.availableCommands = commandsUpdate.availableCommands;
      forceFullSave = true;

      logger.info("Available commands updated for session", {
        sessionId,
        commandCount: commandsUpdate.availableCommands.length,
      });
    }

    // For streaming text messages, merge content with the most recent streaming message of same role
    if (!messageUpdated && message.metadata.isStreaming) {
      let streamingIndex = -1;
      let existingEntryContent: string | undefined;
      if (roleKey) {
        const entry = streamingState[roleKey];
        if (entry) {
          streamingIndex = session.messages.findIndex((candidate) => candidate.id === entry.id);
          if (streamingIndex < 0) {
            delete streamingState[roleKey];
            if (!streamingState.assistant && !streamingState.user) {
              this.activeStreamingMessages.delete(sessionId);
            }
          } else {
            existingEntryContent = entry.content;
          }
        }
      }

      if (streamingIndex < 0) {
        for (let i = session.messages.length - 1; i >= 0; i--) {
          const candidate = session.messages[i];

          if (candidate.role === message.role) {
            if (candidate.metadata?.isStreaming && candidate.role !== "tool") {
              streamingIndex = i;
            }
            break;
          }

          if (candidate.role === "system") {
            continue;
          }

          break;
        }
      }

      if (streamingIndex >= 0) {
        const lastMessage = session.messages[streamingIndex];

        logger.info("Replacing streaming message content", {
          sessionId,
          existingMessageId: lastMessage?.id,
          existingContentLength: lastMessage.content?.length || 0,
          newContentLength: message.content?.length || 0,
          existingContentPreview: (lastMessage.content ?? "").slice(-50),
          newContentPreview: (message.content ?? "").slice(-50),
        });

        // Merge the latest chunk with the existing streaming content, supporting both cumulative and delta payloads
        const previousContent = existingEntryContent ?? lastMessage.content ?? "";
        const mergedContent = this.mergeStreamingContent(previousContent, message.content ?? "");
        lastMessage.content = mergedContent;
        lastMessage.timestamp = message.timestamp;
        notificationTarget = lastMessage;
        messageUpdated = true;
        if (roleKey) {
          streamingState[roleKey] = {
            id: lastMessage.id,
            content: mergedContent,
          };
        }

        logger.info("After replacement", {
          sessionId,
          totalLength: lastMessage.content.length,
          lastSection: lastMessage.content.slice(-100),
        });
      } else if (roleKey) {
        this.markStreamingComplete(session, roleKey);
        forceFullSave = true;
      }
    }

    if (!notificationTarget.metadata?.isStreaming && roleKey) {
      this.markStreamingComplete(session, roleKey);
    }

    // If no existing message was updated, add as new message
    if (!messageUpdated) {
      logger.debug("Adding new message to session", {
        sessionId,
        messageId: message.id,
        messageRole: message.role,
        contentLength: message.content?.length || 0,
      });

      session.messages.push(message);
      if (message.metadata.isStreaming && roleKey) {
        streamingState[roleKey] = {
          id: message.id,
          content: message.content ?? "",
        };
      }
    }

    session.lastActivity = new Date();
    if (messageUpdated || forceFullSave) {
      await this.storageService.saveConversation(session);
      await this.persistenceService.saveSessionSnapshot(session);
    } else {
      await this.persistenceService.recordMessage(sessionId, message);
      await this.persistenceService.saveSessionSnapshot(session);
    }

    const observer = this.sessionObservers.get(sessionId);
    if (observer) {
      observer(notificationTarget);
    }
  }

  private transformSessionUpdate(update: SessionUpdateNotification, sequence: number): SessionMessage | null {
    const { update: payload } = update;
    if (!payload) {
      return null;
    }

    switch (payload.sessionUpdate) {
      case "agent_message_chunk":
      case "user_message_chunk": {
        const role = payload.sessionUpdate === "user_message_chunk" ? "user" : "assistant";

        logger.info("Processing streaming chunk", {
          sessionId: update.sessionId,
          updateType: payload.sessionUpdate,
          payloadContent: JSON.stringify(payload.content, null, 2),
          fullPayload: JSON.stringify(payload, null, 2),
        });

        const { text, messageType } = this.flattenAcpContent([payload.content]);

        logger.info("Streaming chunk processed", {
          sessionId: update.sessionId,
          role,
          messageType,
          textLength: text.length,
          textPreview: text.slice(0, 120),
          fullText: text,
          textCharCodes: Array.from(text)
            .map((char, idx) => ({
              idx,
              char,
              code: char.charCodeAt(0),
              isSpace: char === " ",
              isNewline: char === "\n",
              isTab: char === "\t",
            }))
            .slice(0, 50),
        });

        return {
          id: `${payload.sessionUpdate}-${Date.now()}`,
          role,
          content: text,
          timestamp: new Date(),
          metadata: {
            source: role === "user" ? "user" : "agent",
            messageType,
            sequence,
            isStreaming: true,
          },
        };
      }
      case "agent_thought_chunk": {
        // Filter out internal agent thoughts - these should not be displayed to the user
        logger.debug("Filtering out agent thought chunk", {
          sessionId: update.sessionId,
          thoughtContent: JSON.stringify(payload.content, null, 2),
        });
        return null;
      }
      case "tool_call": {
        const toolCall = payload as ToolCall;

        logger.debug("Processing tool_call", {
          toolCallId: toolCall.toolCallId,
          title: toolCall.title,
          status: toolCall.status,
          kind: toolCall.kind,
          contentLength: toolCall.content?.length || 0,
          rawInput: JSON.stringify(toolCall.rawInput, null, 2),
          rawOutput: JSON.stringify(toolCall.rawOutput, null, 2),
          fullToolCall: JSON.stringify(toolCall, null, 2),
        });

        const statusText = this.formatToolStatus(toolCall.status);
        const detailText = this.flattenToolCallContent(toolCall.content);
        const rawOutputText = this.stringifyRawOutput(toolCall.rawOutput);

        logger.debug("Tool call content processing", {
          toolCallId: toolCall.toolCallId,
          statusText,
          detailTextLength: detailText?.length || 0,
          detailText: detailText || "empty",
          rawOutputTextLength: rawOutputText?.length || 0,
          rawOutputText: rawOutputText || "empty",
        });

        const sections = [
          [toolCall.title ?? toolCall.toolCallId, statusText].filter(Boolean).join(" - "),
          detailText || rawOutputText || "Tool call executed",
        ].filter((section) => section && section.trim().length > 0);

        const finalContent = sections.join("\n\n").trim() || `Tool call: ${toolCall.title ?? toolCall.toolCallId}`;

        logger.debug("Tool call final content", {
          toolCallId: toolCall.toolCallId,
          sectionsCount: sections.length,
          finalContentLength: finalContent.length,
          finalContent,
        });

        return {
          id: toolCall.toolCallId,
          role: "tool",
          content: finalContent,
          timestamp: new Date(),
          metadata: {
            source: "agent",
            messageType: "tool_call",
            sequence,
          },
          toolCall: {
            name: toolCall.title ?? toolCall.toolCallId,
            arguments: toolCall.rawInput ?? {},
            callId: toolCall.toolCallId,
          },
        };
      }
      case "tool_call_update": {
        const toolUpdate = payload as ToolCallUpdate;

        logger.debug("Processing tool_call_update", {
          toolCallId: toolUpdate.toolCallId,
          title: toolUpdate.title,
          status: toolUpdate.status,
          kind: toolUpdate.kind,
          contentLength: toolUpdate.content?.length || 0,
          rawInput: JSON.stringify(toolUpdate.rawInput, null, 2),
          rawOutput: JSON.stringify(toolUpdate.rawOutput, null, 2),
          fullToolUpdate: JSON.stringify(toolUpdate, null, 2),
        });

        const status = toolUpdate.status ?? null;
        const statusText = this.formatToolStatus(status);
        const contentText = this.flattenToolCallContent(toolUpdate.content ?? undefined);
        const rawOutputText = this.stringifyRawOutput(toolUpdate.rawOutput);

        logger.debug("Tool call update content processing", {
          toolCallId: toolUpdate.toolCallId,
          status,
          statusText,
          contentTextLength: contentText?.length || 0,
          contentText: contentText || "empty",
          rawOutputTextLength: rawOutputText?.length || 0,
          rawOutputText: rawOutputText || "empty",
          rawOutputType: typeof toolUpdate.rawOutput,
          rawOutputDebug: toolUpdate.rawOutput ? JSON.stringify(toolUpdate.rawOutput, null, 2) : "null",
        });

        const bodySections = [
          [toolUpdate.title ?? toolUpdate.toolCallId, statusText ? `Status: ${statusText}` : null]
            .filter(Boolean)
            .join(" - "),
          contentText || rawOutputText || "Tool update received",
        ].filter((section) => section && section.trim().length > 0);

        const renderedText = bodySections.join("\n\n").trim() || `Tool update${statusText ? ` (${statusText})` : ""}`;
        const isTerminal = status === "completed" || status === "failed";

        logger.debug("Tool call update final content", {
          toolCallId: toolUpdate.toolCallId,
          bodySectionsCount: bodySections.length,
          renderedTextLength: renderedText.length,
          renderedText,
          isTerminal,
        });

        return {
          id: toolUpdate.toolCallId,
          role: "tool",
          content: renderedText,
          timestamp: new Date(),
          metadata: {
            source: "agent",
            messageType: isTerminal ? "tool_result" : "tool_call",
            sequence,
          },
          toolCall: {
            name: toolUpdate.title ?? toolUpdate.toolCallId,
            arguments: toolUpdate.rawInput ?? {},
            callId: toolUpdate.toolCallId,
          },
          toolResult: isTerminal
            ? {
                callId: toolUpdate.toolCallId,
                result: toolUpdate.rawOutput ?? (contentText || rawOutputText || null),
                success: status === "completed",
                error: status === "failed" ? (rawOutputText ?? "Tool call failed") : undefined,
              }
            : undefined,
        };
      }
      case "plan": {
        const planUpdate = payload as PlanUpdate;
        const planEntries = Array.isArray(planUpdate.entries)
          ? planUpdate.entries.map((entry, index) => {
              const statusSymbol = entry.status === "completed" ? "x" : entry.status === "in_progress" ? "~" : " ";
              return `${index + 1}. [${statusSymbol}] ${entry.content} (${entry.priority})`;
            })
          : [];

        const legacyPlan = (
          planUpdate as unknown as {
            plan?: { title?: string; description?: string; steps?: { title: string; status?: string }[] };
          }
        ).plan;

        const lines: string[] = ["Plan update:"];

        if (planEntries.length > 0) {
          lines.push(...planEntries);
        } else if (legacyPlan) {
          if (legacyPlan.title) {
            lines.push(legacyPlan.title);
          }
          if (legacyPlan.description) {
            lines.push(legacyPlan.description);
          }
          if (Array.isArray(legacyPlan.steps)) {
            lines.push(
              ...legacyPlan.steps.map((step, index) => {
                const statusSymbol = step.status === "completed" ? "x" : step.status === "running" ? "~" : " ";
                return `${index + 1}. [${statusSymbol}] ${step.title}`;
              }),
            );
          }
        } else {
          lines.push("No plan details provided.");
        }

        const planText = lines.join("\n");

        return {
          id: `plan-${Date.now()}`,
          role: "system",
          content: planText,
          timestamp: new Date(),
          metadata: {
            source: "agent",
            messageType: "text",
            sequence,
          },
        };
      }
      case "available_commands_update": {
        const commandsUpdate = payload as AvailableCommandsUpdate;
        const commandText = commandsUpdate.availableCommands
          .map((command) => `- ${command.name}${command.description ? `: ${command.description}` : ""}`)
          .join("\n");

        return {
          id: `commands-${Date.now()}`,
          role: "system",
          content: `Available Commands:\n${commandText}`,
          timestamp: new Date(),
          metadata: {
            source: "agent",
            messageType: "text",
            sequence,
          },
        };
      }
      case "current_mode_update": {
        const modeChange = payload as CurrentModeUpdate;

        // The actual mode update happens in handleSessionUpdate before transforming
        // This just creates a message to display in the conversation
        return {
          id: `mode-${Date.now()}`,
          role: "system",
          content: `Agent switched to mode: ${modeChange.currentModeId}`,
          timestamp: new Date(),
          metadata: {
            source: "agent",
            messageType: "text",
            sequence,
          },
        };
      }
      default:
        return null;
    }
  }
}
