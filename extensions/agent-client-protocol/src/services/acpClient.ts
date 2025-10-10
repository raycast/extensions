/**
 * Base ACP Client Service
 *
 * Core service for communicating with Agent Client Protocol compatible agents.
 * Handles connection management, message routing, and protocol compliance.
 */

import { spawn, ChildProcess } from "child_process";
import { Writable, Readable } from "stream";
import * as acp from "@zed-industries/agent-client-protocol";
import type {
  ACPRequest,
  ACPResponse,
  ACPNotification,
  InitializeRequest,
  InitializeResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  SessionUpdateNotification,
  ClientCapabilities,
  AgentCapabilities
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
      let stream: acp.Transport;

      if (config.type === 'subprocess') {
        stream = await this.createSubprocessConnection(config);
      } else {
        stream = await this.createRemoteConnection(config);
      }

      // Create ACP connection
      this.connection = new acp.ClientSideConnection(() => this, stream);

      // Initialize the agent
      const initResult = await this.initialize();

      // Create agent connection object
      const agentConnection: AgentConnection = {
        id: this.connectionId,
        name: config.name,
        status: 'connected',
        capabilities: initResult.agentCapabilities,
        protocolVersion: initResult.protocolVersion,
        lastSeen: new Date(),
        errorMessage: undefined
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
  async disconnect(): Promise<void> {
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
    mcpServers?: acp.MCPServer[];
    mode?: string;
  }): Promise<NewSessionResponse> {
    this.ensureConnected();

    const request: NewSessionRequest = {
      cwd: options?.cwd ?? process.cwd(),
      mcpServers: options?.mcpServers ?? [],
      mode: options?.mode
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
  async sendPrompt(sessionId: string, text: string): Promise<PromptResponse> {
    this.ensureConnected();

    const request: PromptRequest = {
      sessionId,
      prompt: [{ type: "text", text }]
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
    // This method is called by the ACP SDK when the agent sends updates
    // We can emit events or call callbacks here to update the UI
    console.log('Session update received:', params);

    // TODO: Implement event emission for UI updates
    // this.eventEmitter.emit('session:update', params);
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
    // TODO: Implement file reading with permission checks
    console.log('File read request:', params.path);

    throw this.createError(
      ErrorCode.FileAccessDenied,
      "File access not implemented yet"
    );
  }

  /**
   * Write text file (if agent requests file write)
   */
  async writeTextFile(params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse> {
    // TODO: Implement file writing with permission checks
    console.log('File write request:', params.path);

    throw this.createError(
      ErrorCode.FileAccessDenied,
      "File write access not implemented yet"
    );
  }

  /**
   * Private: Initialize connection with agent
   */
  private async initialize(): Promise<InitializeResponse> {
    if (!this.connection) {
      throw this.createError(ErrorCode.SystemError, "No connection available");
    }

    const clientCapabilities: ClientCapabilities = {
      fs: {
        readTextFile: true,
        writeTextFile: true
      },
      terminal: false
    };

    const request: InitializeRequest = {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities
    };

    try {
      const response = await this.connection.initialize(request);
      return response;
    } catch (error) {
      throw this.createError(
        ErrorCode.ProtocolVersionMismatch,
        `Agent initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { request, originalError: error }
      );
    }
  }

  /**
   * Private: Create subprocess connection for local agents
   */
  private async createSubprocessConnection(config: AgentConfig): Promise<acp.Transport> {
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
  private async createRemoteConnection(config: AgentConfig): Promise<acp.Transport> {
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
}
