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
import type {
  SessionUpdateNotification
} from "@/types/acp";
import type { AgentConfig, AgentConnection, ExtensionError } from "@/types/extension";
import { ErrorCode } from "@/types/extension";
import { createLogger } from "@/utils/logging";

const logger = createLogger("ACPClient");

export class ACPClient implements acp.Client {
  private connection: acp.ClientSideConnection | null = null;
  private agentProcess: ChildProcess | null = null;
  private config: AgentConfig | null = null;
  private connectionId: string | null = null;
  private isConnecting = false;
  private isConnected = false;
  private lastError: ExtensionError | null = null;
  private updateListeners = new Set<(update: SessionUpdateNotification) => void>();

  constructor() {
    // No initialization needed
  }

  /**
   * Connect to an ACP agent using the provided configuration
   */
  async connect(config: AgentConfig): Promise<AgentConnection> {
    if (this.isConnecting) {
      throw this.createError(ErrorCode.SystemError, "Connection already in progress");
    }

    if (this.isConnected) {
      await this.disconnect();
    }

    this.isConnecting = true;
    this.config = config;
    this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let stream: Stream;

      if (config.type === 'subprocess') {
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
        status: 'connected',
        connectedAt,
        lastActivity: connectedAt,
        sessionCount: 0,
        metadata: {
          endpoint: config.endpoint,
          capabilities: initResult.agentCapabilities
            ? Object.entries(initResult.agentCapabilities)
                .filter(([, value]) => value)
                .map(([key]) => key)
            : []
        }
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
        `Failed to connect to agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );

      this.lastError = extensionError;
      throw extensionError;
    }
  }

  /**
   * Disconnect from the current agent
   */
  async disconnect(_connectionId?: string): Promise<void> {
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
  getConnectionStatus(): AgentConnection['status'] {
    if (this.isConnecting) return 'connecting';
    if (this.isConnected) return 'connected';
    if (this.lastError) return 'error';
    return 'disconnected';
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
      mcpServers: options?.mcpServers ?? []
    };

    try {
      const response = await this.connection!.newSession(request);
      return response;
    } catch (error) {
      throw this.createError(
        ErrorCode.SessionNotFound,
        `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { request, originalError: error }
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
          text
        }
      ]
    };

    try {
      const response = await this.connection!.prompt(request);
      return response;
    } catch (error) {
      throw this.createError(
        ErrorCode.ProtocolError,
        `Failed to send prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId, prompt: text, originalError: error }
      );
    }
  }

  /**
   * Handle session updates from the agent (streaming responses)
   */
  async sessionUpdate(params: acp.SessionNotification): Promise<void> {
    logger.debug('ACP session update received from agent', {
      sessionId: params.sessionId,
      updateType: params.update?.sessionUpdate,
      fullUpdate: JSON.stringify(params, null, 2)
    });

    for (const listener of this.updateListeners) {
      try {
        listener(params as SessionUpdateNotification);
      } catch (error) {
        logger.warn('Session update listener failed', { error });
      }
    }
  }

  /**
   * Handle permission requests from the agent
   */
  async requestPermission(params: acp.RequestPermissionRequest): Promise<acp.RequestPermissionResponse> {
    // TODO: Implement permission UI dialog
    console.log('Permission request:', params);

    // For now, default to deny
    return {
      outcome: {
        outcome: "cancelled"
      }
    };
  }

  /**
   * Read text file (if agent requests file access)
   */
  async readTextFile(params: acp.ReadTextFileRequest): Promise<acp.ReadTextFileResponse> {
    logger.info('File read request', {
      path: params.path,
      sessionId: params.sessionId
    });

    try {
      // Import fs dynamically to avoid issues in browser environments
      const fs = await import('fs');
      const path = await import('path');

      // Validate the path
      if (!params.path || typeof params.path !== 'string') {
        throw new Error('Invalid file path provided');
      }

      // Security check - prevent access to sensitive files
      const normalizedPath = path.resolve(params.path);
      const fileName = path.basename(normalizedPath);

      // Block access to sensitive files
      const blockedPatterns = [
        /^\.env/, /\.key$/, /\.pem$/, /\.p12$/, /\.password$/,
        /^id_rsa/, /^id_dsa/, /^id_ecdsa/, /^id_ed25519/,
        /\.ssh/, /\.aws/, /\.gcp/, /password/i, /secret/i
      ];

      if (blockedPatterns.some(pattern => pattern.test(fileName))) {
        logger.warn('Blocked access to sensitive file', { path: params.path });
        throw this.createError(
          ErrorCode.FileAccessDenied,
          'Access to sensitive files is not allowed'
        );
      }

      // Check if file exists and is readable
      if (!fs.existsSync(normalizedPath)) {
        throw this.createError(
          ErrorCode.FileNotFound,
          `File not found: ${params.path}`
        );
      }

      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        throw this.createError(
          ErrorCode.FileNotFound,
          `Path is not a file: ${params.path}`
        );
      }

      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        throw this.createError(
          ErrorCode.FileAccessDenied,
          `File too large (max 10MB): ${params.path}`
        );
      }

      // Read the file
      const content = fs.readFileSync(normalizedPath, 'utf-8');

      logger.info('File read successful', {
        path: params.path,
        size: content.length
      });

      return { content };

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        // Re-throw our custom errors
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('File read failed', {
        path: params.path,
        error: errorMessage
      });

      throw this.createError(
        ErrorCode.SystemError,
        `Failed to read file: ${errorMessage}`
      );
    }
  }

  /**
   * Write text file (if agent requests file write)
   */
  async writeTextFile(params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse> {
    logger.info('File write request', {
      path: params.path,
      contentLength: params.content?.length || 0,
      sessionId: params.sessionId
    });

    try {
      // Import fs dynamically to avoid issues in browser environments
      const fs = await import('fs');
      const path = await import('path');

      // Validate the path and content
      if (!params.path || typeof params.path !== 'string') {
        throw new Error('Invalid file path provided');
      }

      if (typeof params.content !== 'string') {
        throw new Error('Invalid content provided');
      }

      // Security checks
      const normalizedPath = path.resolve(params.path);
      const fileName = path.basename(normalizedPath);
      const dirName = path.dirname(normalizedPath);

      // Block access to sensitive files and directories
      const blockedPatterns = [
        /^\.env/, /\.key$/, /\.pem$/, /\.p12$/, /\.password$/,
        /^id_rsa/, /^id_dsa/, /^id_ecdsa/, /^id_ed25519/,
        /\.ssh/, /\.aws/, /\.gcp/, /password/i, /secret/i
      ];

      const blockedDirs = [
        '/etc', '/usr', '/bin', '/sbin', '/var', '/root',
        '/System', '/Library', '/Applications'
      ];

      if (blockedPatterns.some(pattern => pattern.test(fileName))) {
        logger.warn('Blocked write to sensitive file', { path: params.path });
        throw this.createError(
          ErrorCode.FileAccessDenied,
          'Writing to sensitive files is not allowed'
        );
      }

      if (blockedDirs.some(dir => normalizedPath.startsWith(dir))) {
        logger.warn('Blocked write to system directory', { path: params.path });
        throw this.createError(
          ErrorCode.FileAccessDenied,
          'Writing to system directories is not allowed'
        );
      }

      // Check content size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (params.content.length > maxSize) {
        throw this.createError(
          ErrorCode.FileAccessDenied,
          'Content too large (max 10MB)'
        );
      }

      // Ensure directory exists
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(normalizedPath, params.content, 'utf-8');

      logger.info('File write successful', {
        path: params.path,
        size: params.content.length
      });

      return {}; // Empty response on success per ACP spec

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        // Re-throw our custom errors
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('File write failed', {
        path: params.path,
        error: errorMessage
      });

      throw this.createError(
        ErrorCode.SystemError,
        `Failed to write file: ${errorMessage}`
      );
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
        writeTextFile: true
      },
      terminal: false
    };

    const request: acp.InitializeRequest = {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities
    };

    try {
      const response = await this.connection.initialize(request);
      return response;
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Agent initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { request, originalError: error }
      );
    }
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
      const existingPath =
        mergedEnv.PATH ??
        mergedEnv.Path ??
        mergedEnv.path ??
        process.env.PATH ??
        "";

      const currentSegments = existingPath
        ? existingPath.split(":").map((segment) => segment.trim()).filter(Boolean)
        : [];

      const appendSegments = config.appendToPath.filter(Boolean);
      for (const segment of appendSegments) {
        if (!currentSegments.includes(segment)) {
          currentSegments.push(segment);
        }
      }

      if (currentSegments.length > 0) {
        mergedEnv.PATH = currentSegments.join(":");
        mergedEnv.Path = mergedEnv.PATH;
        mergedEnv.path = mergedEnv.PATH;
      }
    }

    logger.info("Spawning ACP agent subprocess", {
      command: config.command,
      args: config.args,
      cwd: config.workingDirectory || process.cwd(),
      path: mergedEnv.PATH ?? process.env.PATH ?? ""
    });

    // Spawn the agent process
    this.agentProcess = spawn(config.command, config.args || [], {
      stdio: ['pipe', 'pipe', 'inherit'],
      cwd: config.workingDirectory || process.cwd(),
      env: mergedEnv
    });

    if (!this.agentProcess.stdin || !this.agentProcess.stdout) {
      throw this.createError(ErrorCode.SystemError, "Failed to create agent process streams");
    }

    // Handle process errors
    this.agentProcess.on('error', (error) => {
      console.error('Agent process error:', error);
      this.lastError = this.createError(ErrorCode.AgentUnavailable, `Agent process error: ${error.message}`);
    });

    this.agentProcess.on('exit', (code, signal) => {
      console.log(`Agent process exited with code ${code}, signal ${signal}`);
      this.isConnected = false;
    });

    // Create streams for ACP communication
    const input = Writable.toWeb(this.agentProcess.stdin);
    const output = Readable.toWeb(this.agentProcess.stdout) as ReadableStream<Uint8Array>;

    return acp.ndJsonStream(input, output);
  }

  /**
   * Private: Create remote connection for network agents
   */
  private async createRemoteConnection(config: AgentConfig): Promise<Stream> {
    // TODO: Implement WebSocket or HTTP connection for remote agents
    throw this.createError(ErrorCode.SystemError, "Remote agent connections not implemented yet");
  }

  /**
   * Private: Ensure we have an active connection
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.connection) {
      throw this.createError(ErrorCode.AgentUnavailable, "No active agent connection");
    }
  }

  /**
   * Private: Create standardized error objects
   */
  private createError(code: ErrorCode, message: string, context?: Record<string, unknown>): ExtensionError {
    return {
      code,
      message,
      details: context ? JSON.stringify(context, null, 2) : '',
      timestamp: new Date(),
      context
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
          endpoint: this.config.endpoint
        }
      };
    }
    return null;
  }

  /**
   * Get all active connections
   */
  async getActiveConnections(): Promise<AgentConnection[]> {
    const connection = await this.getConnection(this.connectionId || '');
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
    logger.debug('endSession called', { sessionId });
  }
}
