/**
 * Base ACP Client Service
 *
 * Core service for communicating with Agent Client Protocol compatible agents.
 * Handles connection management, message routing, and protocol compliance.
 */

import { spawn, ChildProcess } from "child_process";
import { Writable, Readable } from "stream";
import * as acp from "@zed-industries/agent-client-protocol";
import type { Stream } from "@zed-industries/agent-client-protocol";
import type { SessionUpdateNotification } from "@/types/acp";
import type { AgentConfig, AgentConnection, ExtensionError } from "@/types/extension";
import { ErrorCode } from "@/types/extension";
import { createLogger } from "@/utils/logging";
import { ProcessTracker } from "./processTracker";
import { PermissionService } from "./permissionService";
import { TerminalManager } from "./terminalManager";

const logger = createLogger("ACPClient");

type RpcConnection = {
  sendNotification<TParams>(method: string, params?: TParams): Promise<void>;
  sendRequest<TParams, TResponse>(method: string, params?: TParams): Promise<TResponse>;
};

export class ACPClient implements acp.Client {
  private connection: acp.ClientSideConnection | null = null;
  private agentProcess: ChildProcess | null = null;
  private config: AgentConfig | null = null;
  private connectionId: string | null = null;
  private isConnecting = false;
  private isConnected = false;
  private lastError: ExtensionError | null = null;
  private updateListeners = new Set<(update: SessionUpdateNotification) => void>();
  private permissionService = new PermissionService();

  constructor() {
    // Initialize process tracker on first instantiation
    ProcessTracker.initialize().catch((error) => {
      logger.error("Failed to initialize process tracker", { error });
    });
  }

  /**
   * Connect to an ACP agent using the provided configuration
   */
  async connect(config: AgentConfig): Promise<AgentConnection> {
    if (this.isConnecting) {
      throw this.createError(ErrorCode.SystemError, "Connection already in progress");
    }

    // Reuse existing connection if it's for the same agent
    if (this.isConnected && this.config?.id === config.id) {
      logger.info("Reusing existing agent connection", {
        agentId: config.id,
        connectionId: this.connectionId,
      });

      return {
        id: this.connectionId!,
        agentId: config.id,
        status: "connected",
        connectedAt: new Date(), // We don't track original connection time
        lastActivity: new Date(),
        sessionCount: 0,
        metadata: {
          endpoint: config.endpoint,
          capabilities: [],
        },
      };
    }

    // Disconnect from different agent if currently connected
    if (this.isConnected) {
      logger.info("Disconnecting from previous agent", {
        previousAgentId: this.config?.id,
        newAgentId: config.id,
      });
      await this.disconnect();
    }

    this.isConnecting = true;
    this.config = config;
    this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let stream: Stream;

      if (config.type === "subprocess") {
        stream = await this.createSubprocessConnection(config);
      } else {
        stream = await this.createRemoteConnection(config);
      }

      // Create ACP connection
      this.connection = new acp.ClientSideConnection(() => this, stream);

      // Initialize the agent
      const initResult = await this.initialize();

      const connectedAt = new Date();

      // Create agent connection object
      const agentConnection: AgentConnection = {
        id: this.connectionId,
        agentId: config.id,
        status: "connected",
        connectedAt,
        lastActivity: connectedAt,
        sessionCount: 0,
        metadata: {
          endpoint: config.endpoint,
          capabilities: initResult.agentCapabilities
            ? Object.entries(initResult.agentCapabilities)
                .filter(([, value]) => value)
                .map(([key]) => key)
            : [],
        },
      };

      this.isConnected = true;
      this.isConnecting = false;
      this.lastError = null;

      return agentConnection;
    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;

      const extensionError = this.createError(
        ErrorCode.AgentConnectionFailed,
        `Failed to connect to agent: ${error instanceof Error ? error.message : "Unknown error"}`,
        { originalError: error },
      );

      this.lastError = extensionError;
      throw extensionError;
    }
  }

  /**
   * Disconnect from the current agent
   */
  async disconnect(connectionId?: string): Promise<void> {
    if (connectionId && this.connectionId && connectionId !== this.connectionId) {
      logger.debug("Disconnect called with mismatched connection ID", {
        requestedId: connectionId,
        currentId: this.connectionId,
      });
    }

    if (this.config?.id) {
      // Kill tracked process using ProcessTracker
      ProcessTracker.killProcess(this.config.id);
    }

    if (this.agentProcess) {
      this.agentProcess.kill();
      this.agentProcess = null;
    }

    this.connection = null;
    this.isConnected = false;
    this.connectionId = null;
    this.config = null;
  }

  /**
   * Check if currently connected to an agent
   */
  isAgentConnected(): boolean {
    return this.isConnected && this.connection !== null;
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): AgentConnection["status"] {
    if (this.isConnecting) return "connecting";
    if (this.isConnected) return "connected";
    if (this.lastError) return "error";
    return "disconnected";
  }

  /**
   * Create a new session with the connected agent
   */
  async createSession(options?: {
    cwd?: string;
    mcpServers?: acp.McpServer[];
    mode?: string;
  }): Promise<acp.NewSessionResponse> {
    this.ensureConnected();

    const request: acp.NewSessionRequest = {
      cwd: options?.cwd ?? process.cwd(),
      mcpServers: options?.mcpServers ?? [],
    };

    logger.info("Creating ACP session", {
      cwd: request.cwd,
      mcpServersCount: request.mcpServers?.length || 0,
      mode: options?.mode,
    });

    try {
      const response = await this.connection!.newSession(request);

      logger.info("ACP newSession response received", {
        response: JSON.stringify(response, null, 2),
        hasSessionId: !!response?.sessionId,
        hasModes: !!response?.modes,
        modesDetail: response?.modes
          ? {
              currentModeId: response.modes.currentModeId,
              availableModes: response.modes.availableModes?.map((m) => ({
                id: m.id,
                name: m.name,
                description: m.description,
              })),
            }
          : "none",
      });

      return response;
    } catch (error) {
      logger.error("Failed to create ACP session", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        request,
      });

      throw this.createError(
        ErrorCode.SessionNotFound,
        `Failed to create session: ${error instanceof Error ? error.message : "Unknown error"}`,
        { request, originalError: error },
      );
    }
  }

  /**
   * Send a prompt to the agent
   */
  async sendPrompt(sessionId: string, text: string): Promise<acp.PromptResponse> {
    this.ensureConnected();

    const request: acp.PromptRequest = {
      sessionId,
      prompt: [
        {
          type: "text",
          text,
        },
      ],
    };

    logger.info("Sending prompt to agent", {
      sessionId,
      promptLength: text.length,
      promptPreview: text.slice(0, 100),
    });

    try {
      const response = await this.connection!.prompt(request);

      logger.info("Prompt response received", {
        sessionId,
        stopReason: response.stopReason,
        response: JSON.stringify(response, null, 2),
      });

      return response;
    } catch (error) {
      logger.error("Failed to send prompt", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw this.createError(
        ErrorCode.ProtocolError,
        `Failed to send prompt: ${error instanceof Error ? error.message : "Unknown error"}`,
        { sessionId, prompt: text, originalError: error },
      );
    }
  }

  /**
   * Handle session updates from the agent (streaming responses)
   */
  async sessionUpdate(params: acp.SessionNotification): Promise<void> {
    logger.debug("ACP session update received from agent", {
      sessionId: params.sessionId,
      updateType: params.update?.sessionUpdate,
      fullUpdate: JSON.stringify(params, null, 2),
    });

    for (const listener of this.updateListeners) {
      try {
        listener(params as SessionUpdateNotification);
      } catch (error) {
        logger.warn("Session update listener failed", { error });
      }
    }
  }

  /**
   * Handle permission requests from the agent
   */
  async requestPermission(params: acp.RequestPermissionRequest): Promise<acp.RequestPermissionResponse> {
    logger.info("Permission request received from agent", {
      sessionId: params.sessionId,
      toolTitle: params.toolCall.title,
    });

    return this.permissionService.handlePermissionRequest(params);
  }

  /**
   * Read text file (if agent requests file access)
   */
  async readTextFile(params: acp.ReadTextFileRequest): Promise<acp.ReadTextFileResponse> {
    logger.info("File read request", {
      path: params.path,
      sessionId: params.sessionId,
    });

    try {
      // Import fs dynamically to avoid issues in browser environments
      const fs = await import("fs");
      const path = await import("path");

      // Validate the path
      if (!params.path || typeof params.path !== "string") {
        throw new Error("Invalid file path provided");
      }

      // Security check - prevent access to sensitive files
      const normalizedPath = path.resolve(params.path);
      const fileName = path.basename(normalizedPath);

      // Block access to sensitive files
      const blockedPatterns = [
        /^\.env/,
        /\.key$/,
        /\.pem$/,
        /\.p12$/,
        /\.password$/,
        /^id_rsa/,
        /^id_dsa/,
        /^id_ecdsa/,
        /^id_ed25519/,
        /\.ssh/,
        /\.aws/,
        /\.gcp/,
        /password/i,
        /secret/i,
      ];

      if (blockedPatterns.some((pattern) => pattern.test(fileName))) {
        logger.warn("Blocked access to sensitive file", { path: params.path });
        throw this.createError(ErrorCode.FileAccessDenied, "Access to sensitive files is not allowed");
      }

      // Check if file exists and is readable
      if (!fs.existsSync(normalizedPath)) {
        throw this.createError(ErrorCode.FileNotFound, `File not found: ${params.path}`);
      }

      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        throw this.createError(ErrorCode.FileNotFound, `Path is not a file: ${params.path}`);
      }

      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        throw this.createError(ErrorCode.FileAccessDenied, `File too large (max 10MB): ${params.path}`);
      }

      // Read the file
      const content = fs.readFileSync(normalizedPath, "utf-8");

      logger.info("File read successful", {
        path: params.path,
        size: content.length,
      });

      return { content };
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        // Re-throw our custom errors
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("File read failed", {
        path: params.path,
        error: errorMessage,
      });

      throw this.createError(ErrorCode.SystemError, `Failed to read file: ${errorMessage}`);
    }
  }

  /**
   * Write text file (if agent requests file write)
   */
  async writeTextFile(params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse> {
    logger.info("File write request", {
      path: params.path,
      contentLength: params.content?.length || 0,
      sessionId: params.sessionId,
    });

    try {
      // Import fs dynamically to avoid issues in browser environments
      const fs = await import("fs");
      const path = await import("path");

      // Validate the path and content
      if (!params.path || typeof params.path !== "string") {
        throw new Error("Invalid file path provided");
      }

      if (typeof params.content !== "string") {
        throw new Error("Invalid content provided");
      }

      // Security checks
      const normalizedPath = path.resolve(params.path);
      const fileName = path.basename(normalizedPath);
      const dirName = path.dirname(normalizedPath);

      // Block access to sensitive files and directories
      const blockedPatterns = [
        /^\.env/,
        /\.key$/,
        /\.pem$/,
        /\.p12$/,
        /\.password$/,
        /^id_rsa/,
        /^id_dsa/,
        /^id_ecdsa/,
        /^id_ed25519/,
        /\.ssh/,
        /\.aws/,
        /\.gcp/,
        /password/i,
        /secret/i,
      ];

      const blockedDirs = ["/etc", "/usr", "/bin", "/sbin", "/var", "/root", "/System", "/Library", "/Applications"];

      if (blockedPatterns.some((pattern) => pattern.test(fileName))) {
        logger.warn("Blocked write to sensitive file", { path: params.path });
        throw this.createError(ErrorCode.FileAccessDenied, "Writing to sensitive files is not allowed");
      }

      if (blockedDirs.some((dir) => normalizedPath.startsWith(dir))) {
        logger.warn("Blocked write to system directory", { path: params.path });
        throw this.createError(ErrorCode.FileAccessDenied, "Writing to system directories is not allowed");
      }

      // Check content size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (params.content.length > maxSize) {
        throw this.createError(ErrorCode.FileAccessDenied, "Content too large (max 10MB)");
      }

      // Ensure directory exists
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(normalizedPath, params.content, "utf-8");

      logger.info("File write successful", {
        path: params.path,
        size: params.content.length,
      });

      return {}; // Empty response on success per ACP spec
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        // Re-throw our custom errors
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("File write failed", {
        path: params.path,
        error: errorMessage,
      });

      throw this.createError(ErrorCode.SystemError, `Failed to write file: ${errorMessage}`);
    }
  }

  /**
   * Private: Initialize connection with agent
   */
  private async initialize(): Promise<acp.InitializeResponse> {
    if (!this.connection) {
      throw this.createError(ErrorCode.SystemError, "No connection available");
    }

    const clientCapabilities: acp.ClientCapabilities = {
      fs: {
        readTextFile: true,
        writeTextFile: true,
      },
      terminal: true,
    };

    const request: acp.InitializeRequest = {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities,
    };

    try {
      const response = await this.connection.initialize(request);
      return response;
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Agent initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { request, originalError: error },
      );
    }
  }

  /**
   * Wrap a WritableStream to catch and suppress AbortErrors
   */
  private wrapWritableStreamWithErrorHandling(stream: WritableStream): WritableStream {
    const originalAbort = stream.abort.bind(stream);
    const originalClose = stream.close.bind(stream);

    return new WritableStream({
      async write(chunk) {
        try {
          const writer = stream.getWriter();
          await writer.write(chunk);
          writer.releaseLock();
        } catch (error) {
          // Suppress AbortError and ERR_STREAM_PREMATURE_CLOSE errors
          if (
            error instanceof Error &&
            (error.name === "AbortError" || ("code" in error && error.code === "ABORT_ERR"))
          ) {
            logger.debug("Stream write aborted (process likely exited)", {
              error: error.message,
              name: error.name,
              code: "code" in error ? error.code : undefined,
            });
            return; // Suppress the error
          }
          throw error;
        }
      },
      async close() {
        try {
          await originalClose();
        } catch (error) {
          // Suppress close errors if the stream is already closed
          if (
            error instanceof Error &&
            (error.name === "AbortError" || ("code" in error && error.code === "ABORT_ERR"))
          ) {
            logger.debug("Stream close aborted (already closed)", { error: error.message });
            return;
          }
          throw error;
        }
      },
      async abort(reason) {
        try {
          await originalAbort(reason);
        } catch (error) {
          logger.debug("Stream abort error (ignored)", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    });
  }

  /**
   * Private: Create subprocess connection for local agents
   */
  private async createSubprocessConnection(config: AgentConfig): Promise<Stream> {
    if (!config.command) {
      throw this.createError(ErrorCode.InvalidConfiguration, "Subprocess agent requires command");
    }

    const baseEnv: NodeJS.ProcessEnv = { ...process.env };
    const mergedEnv: NodeJS.ProcessEnv = { ...baseEnv, ...(config.environmentVariables ?? {}) };

    if (config.appendToPath?.length) {
      const existingPath = mergedEnv.PATH ?? mergedEnv.Path ?? mergedEnv.path ?? process.env.PATH ?? "";
      // Use platform-specific PATH separator (: for Unix, ; for Windows)
      const pathSeparator = process.platform === "win32" ? ";" : ":";

      const currentSegments = existingPath
        ? existingPath
            .split(pathSeparator)
            .map((segment) => segment.trim())
            .filter(Boolean)
        : [];

      const appendSegments = config.appendToPath.filter(Boolean);
      for (const segment of appendSegments) {
        if (!currentSegments.includes(segment)) {
          currentSegments.push(segment);
        }
      }

      if (currentSegments.length > 0) {
        mergedEnv.PATH = currentSegments.join(pathSeparator);
        mergedEnv.Path = mergedEnv.PATH;
        mergedEnv.path = mergedEnv.PATH;
      }
    }

    logger.info("Spawning ACP agent subprocess", {
      command: config.command,
      args: config.args,
      cwd: config.workingDirectory || process.cwd(),
      path: mergedEnv.PATH ?? process.env.PATH ?? "",
    });

    // Check if there's already a running process for this agent
    const existingPid = ProcessTracker.getProcessPid(config.id);
    if (existingPid) {
      logger.info("Found existing agent process, killing it first", {
        agentId: config.id,
        existingPid,
      });
      ProcessTracker.killProcess(config.id);
    }

    // Spawn the agent process
    this.agentProcess = spawn(config.command, config.args || [], {
      stdio: ["pipe", "pipe", "inherit"],
      cwd: config.workingDirectory || process.cwd(),
      env: mergedEnv,
    });

    if (!this.agentProcess.stdin || !this.agentProcess.stdout) {
      throw this.createError(ErrorCode.SystemError, "Failed to create agent process streams");
    }

    // Register the process with tracker
    if (this.agentProcess.pid) {
      ProcessTracker.registerProcess(config.id, this.agentProcess.pid, config.command);
      logger.info("Registered agent process with tracker", {
        agentId: config.id,
        pid: this.agentProcess.pid,
      });
    }

    // Handle process errors
    this.agentProcess.on("error", (error) => {
      logger.error("Agent process error", { error: error.message });
      this.lastError = this.createError(ErrorCode.AgentUnavailable, `Agent process error: ${error.message}`);
      ProcessTracker.unregisterProcess(config.id);
    });

    this.agentProcess.on("exit", (code, signal) => {
      logger.info("Agent process exited", { code, signal });
      this.isConnected = false;
      this.connection = null;
      ProcessTracker.unregisterProcess(config.id);
    });

    // Handle unexpected process closure
    this.agentProcess.on("close", (code, signal) => {
      logger.debug("Agent process closed", { code, signal });
      this.isConnected = false;
      this.connection = null;
    });

    // Create streams for ACP communication
    const stdinStream = this.agentProcess.stdin;
    const stdoutStream = this.agentProcess.stdout;

    // Add error handling for stream closures
    stdinStream.on("error", (error) => {
      logger.debug("Agent stdin stream error", { error: error.message });
      // Don't throw here as this is expected when the process exits
    });

    stdoutStream.on("error", (error) => {
      logger.debug("Agent stdout stream error", { error: error.message });
    });

    const input = Writable.toWeb(stdinStream);
    const output = Readable.toWeb(stdoutStream) as ReadableStream<Uint8Array>;

    // Wrap the input stream to handle AbortErrors gracefully
    const wrappedInput = this.wrapWritableStreamWithErrorHandling(input);

    return acp.ndJsonStream(wrappedInput, output);
  }

  /**
   * Private: Create remote connection for network agents
   */
  private async createRemoteConnection(config: AgentConfig): Promise<Stream> {
    // TODO: Implement WebSocket or HTTP connection for remote agents
    throw this.createError(ErrorCode.SystemError, "Remote agent connections not implemented yet", {
      agentId: config.id,
      endpoint: config.endpoint,
      type: config.type,
    });
  }

  /**
   * Private: Ensure we have an active connection
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.connection) {
      throw this.createError(ErrorCode.AgentUnavailable, "No active agent connection");
    }
  }

  private getActiveRpcConnection(): RpcConnection {
    this.ensureConnected();
    return this.connection as unknown as RpcConnection;
  }

  /**
   * Private: Create standardized error objects
   */
  private createError(code: ErrorCode, message: string, context?: Record<string, unknown>): ExtensionError {
    return {
      code,
      message,
      details: context ? JSON.stringify(context, null, 2) : "",
      timestamp: new Date(),
      context,
    };
  }

  registerSessionUpdateListener(listener: (update: SessionUpdateNotification) => void): void {
    this.updateListeners.add(listener);
  }

  unregisterSessionUpdateListener(listener: (update: SessionUpdateNotification) => void): void {
    this.updateListeners.delete(listener);
  }

  /**
   * Get a specific connection by ID
   */
  async getConnection(connectionId: string): Promise<AgentConnection | null> {
    if (this.connectionId === connectionId && this.isConnected && this.config) {
      return {
        id: this.connectionId,
        agentId: this.config.id,
        status: this.getConnectionStatus(),
        connectedAt: new Date(), // We don't track this, using current time as fallback
        lastActivity: new Date(),
        sessionCount: 0,
        metadata: {
          endpoint: this.config.endpoint,
        },
      };
    }
    return null;
  }

  /**
   * Get all active connections
   */
  async getActiveConnections(): Promise<AgentConnection[]> {
    const connection = await this.getConnection(this.connectionId || "");
    return connection ? [connection] : [];
  }

  /**
   * Check if a connection is healthy
   */
  async checkConnection(connectionId: string): Promise<boolean> {
    if (this.connectionId !== connectionId) {
      return false;
    }
    return this.isAgentConnected();
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    // For now, we don't have explicit session management on the ACP side
    // This is a no-op that allows the session service to work
    logger.debug("endSession called", { sessionId });

    // Clean up any terminals associated with this session
    TerminalManager.cleanupSession(sessionId);
  }

  /**
   * Cancel an ongoing prompt turn
   *
   * Sends a session/cancel notification to the agent to stop processing.
   * The agent should abort all ongoing operations and respond with a cancelled stop reason.
   */
  async cancelSession(sessionId: string): Promise<void> {
    logger.info("Cancelling session", { sessionId });

    try {
      const connection = this.getActiveRpcConnection();
      // Send session/cancel notification
      // This is a notification (one-way message), not a request
      await connection.sendNotification("session/cancel", {
        sessionId,
      });

      logger.info("Session cancel notification sent", { sessionId });
    } catch (error) {
      logger.error("Failed to send cancel notification", {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw this.createError(
        ErrorCode.ProtocolError,
        `Failed to cancel session: ${error instanceof Error ? error.message : "Unknown error"}`,
        { sessionId, originalError: error },
      );
    }
  }

  /**
   * Set the mode for a session
   */
  async setSessionMode(params: acp.SetSessionModeRequest): Promise<acp.SetSessionModeResponse> {
    logger.info("Setting session mode", {
      sessionId: params.sessionId,
      modeId: params.modeId,
    });

    try {
      const connection = this.getActiveRpcConnection();
      // Call the ACP session/set_mode method
      // The connection object handles the JSON-RPC call
      const response = await connection.sendRequest<acp.SetSessionModeRequest, acp.SetSessionModeResponse>(
        "session/set_mode",
        params,
      );

      logger.info("Session mode changed successfully", {
        sessionId: params.sessionId,
        modeId: params.modeId,
      });

      return response || {};
    } catch (error) {
      logger.error("Failed to set session mode", {
        sessionId: params.sessionId,
        modeId: params.modeId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw this.createError(
        ErrorCode.ProtocolError,
        `Failed to set session mode: ${error instanceof Error ? error.message : "Unknown error"}`,
        { sessionId: params.sessionId, modeId: params.modeId, originalError: error },
      );
    }
  }

  /**
   * Create a new terminal and execute a command
   */
  async createTerminal(params: acp.CreateTerminalRequest): Promise<acp.CreateTerminalResponse> {
    logger.info("Terminal creation request", {
      sessionId: params.sessionId,
      command: params.command,
      args: params.args,
      cwd: params.cwd,
    });

    try {
      const result = TerminalManager.createTerminal({
        sessionId: params.sessionId,
        command: params.command,
        args: params.args,
        env: params.env,
        cwd: params.cwd ?? undefined,
        outputByteLimit: params.outputByteLimit ?? undefined,
      });

      logger.info("Terminal created successfully", {
        sessionId: params.sessionId,
        terminalId: result.terminalId,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to create terminal", {
        sessionId: params.sessionId,
        error: errorMessage,
      });

      throw this.createError(ErrorCode.SystemError, `Failed to create terminal: ${errorMessage}`, {
        originalError: error,
      });
    }
  }

  /**
   * Get the current output and status of a terminal
   */
  async terminalOutput(params: acp.TerminalOutputRequest): Promise<acp.TerminalOutputResponse> {
    logger.debug("Terminal output request", {
      sessionId: params.sessionId,
      terminalId: params.terminalId,
    });

    try {
      const result = TerminalManager.getTerminalOutput({
        sessionId: params.sessionId,
        terminalId: params.terminalId,
      });

      return {
        output: result.output,
        truncated: result.truncated,
        exitStatus: result.exitStatus || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to get terminal output", {
        sessionId: params.sessionId,
        terminalId: params.terminalId,
        error: errorMessage,
      });

      throw this.createError(ErrorCode.SystemError, `Failed to get terminal output: ${errorMessage}`, {
        originalError: error,
      });
    }
  }

  /**
   * Wait for a terminal command to exit
   */
  async waitForTerminalExit(params: acp.WaitForTerminalExitRequest): Promise<acp.WaitForTerminalExitResponse> {
    logger.info("Waiting for terminal exit", {
      sessionId: params.sessionId,
      terminalId: params.terminalId,
    });

    try {
      const result = await TerminalManager.waitForTerminalExit({
        sessionId: params.sessionId,
        terminalId: params.terminalId,
      });

      logger.info("Terminal exited", {
        sessionId: params.sessionId,
        terminalId: params.terminalId,
        exitCode: result.exitCode,
        signal: result.signal,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to wait for terminal exit", {
        sessionId: params.sessionId,
        terminalId: params.terminalId,
        error: errorMessage,
      });

      throw this.createError(ErrorCode.SystemError, `Failed to wait for terminal exit: ${errorMessage}`, {
        originalError: error,
      });
    }
  }

  /**
   * Kill a terminal command without releasing the terminal
   */
  async killTerminal(params: acp.KillTerminalCommandRequest): Promise<acp.KillTerminalResponse> {
    logger.info("Kill terminal request", {
      sessionId: params.sessionId,
      terminalId: params.terminalId,
    });

    try {
      TerminalManager.killTerminal({
        sessionId: params.sessionId,
        terminalId: params.terminalId,
      });

      logger.info("Terminal killed successfully", {
        sessionId: params.sessionId,
        terminalId: params.terminalId,
      });

      return {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to kill terminal", {
        sessionId: params.sessionId,
        terminalId: params.terminalId,
        error: errorMessage,
      });

      throw this.createError(ErrorCode.SystemError, `Failed to kill terminal: ${errorMessage}`, {
        originalError: error,
      });
    }
  }

  /**
   * Release a terminal and free its resources
   */
  async releaseTerminal(params: acp.ReleaseTerminalRequest): Promise<acp.ReleaseTerminalResponse> {
    logger.info("Release terminal request", {
      sessionId: params.sessionId,
      terminalId: params.terminalId,
    });

    try {
      TerminalManager.releaseTerminal({
        sessionId: params.sessionId,
        terminalId: params.terminalId,
      });

      logger.info("Terminal released successfully", {
        sessionId: params.sessionId,
        terminalId: params.terminalId,
      });

      return {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to release terminal", {
        sessionId: params.sessionId,
        terminalId: params.terminalId,
        error: errorMessage,
      });

      throw this.createError(ErrorCode.SystemError, `Failed to release terminal: ${errorMessage}`, {
        originalError: error,
      });
    }
  }
}
