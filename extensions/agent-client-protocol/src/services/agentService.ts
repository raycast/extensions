/**
 * Agent Service - Agent Connection Management
 *
 * Manages connections to ACP agents including:
 * - Connection establishment and teardown
 * - Health monitoring and reconnection
 * - Agent availability checking
 * - Connection pooling and lifecycle management
 */

import { ACPError, ErrorCode } from "@/utils/errors";
import { createLogger, PerformanceLogger } from "@/utils/logging";
import { validateAgentConfig } from "@/utils/builtInAgents";
import type { AgentConnection, ConnectionHealth } from "@/types/entities";
import type { AgentServiceInterface } from "@/types/extension";
import type { ConfigService } from "./configService";
import type { ACPClient } from "./acpClient";

const logger = createLogger("AgentService");

export class AgentService implements AgentServiceInterface {
  private activeConnections = new Map<string, AgentConnection>();
  private healthCheckInterval: NodeJS.Timer | null = null;

  constructor(
    private configService: ConfigService,
    private acpClient: ACPClient,
  ) {
    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Connect to an agent by agent ID
   */
  async connectToAgent(agentId: string): Promise<AgentConnection> {
    const operationId = `connectToAgent-${agentId}`;
    PerformanceLogger.start(operationId);

    try {
      logger.info("Connecting to agent", { agentId });

      // Get agent configuration
      const configs = await this.configService.getAgentConfigs();
      const agentConfig = configs.find((config) => config.id === agentId);

      if (!agentConfig) {
        throw new ACPError(
          ErrorCode.AgentUnavailable,
          `Agent configuration not found: ${agentId}`,
          "The requested agent is not configured. Please check your agent settings.",
          { agentId },
        );
      }

      // Validate configuration
      const validation = validateAgentConfig(agentConfig);
      if (!validation.isValid) {
        throw new ACPError(
          ErrorCode.InvalidConfiguration,
          `Invalid agent configuration: ${validation.errors.join(", ")}`,
          "The agent configuration has validation errors.",
          { agentId, errors: validation.errors },
        );
      }

      // Check if already connected
      const existingConnection = Array.from(this.activeConnections.values()).find(
        (conn) => conn.agentId === agentId && conn.status === "connected",
      );

      if (existingConnection) {
        logger.info("Reusing existing connection", {
          connectionId: existingConnection.id,
          agentId,
        });
        PerformanceLogger.end(operationId, { reused: true });
        return existingConnection;
      }

      // Establish new connection
      try {
        const connection = await this.acpClient.connect(agentConfig);
        const normalized = this.cloneConnection(connection);

        // Store connection
        this.activeConnections.set(normalized.id, normalized);

        logger.info("Agent connected successfully", {
          connectionId: normalized.id,
          agentId,
        });

        PerformanceLogger.end(operationId, {
          success: true,
          connectionId: normalized.id,
        });

        return normalized;
      } catch (error) {
        logger.error("Failed to establish connection", { agentId, error });

        throw new ACPError(
          ErrorCode.AgentConnectionFailed,
          `Failed to connect to agent: ${agentId}`,
          error instanceof Error ? error.message : "Unknown connection error",
          { agentId, originalError: error },
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
   * Disconnect from an agent
   */
  async disconnectAgent(connectionId: string): Promise<void> {
    logger.info("Disconnecting agent", { connectionId });

    try {
      // Remove from active connections first
      const connection = this.activeConnections.get(connectionId);
      this.activeConnections.delete(connectionId);

      if (connection) {
        // Update connection status without mutating original reference
        const updatedConnection: AgentConnection = {
          ...connection,
          status: "disconnected",
          lastActivity: new Date(),
        };
        this.activeConnections.set(connectionId, updatedConnection);
      }

      // Disconnect via ACP client
      await this.acpClient.disconnect(connectionId);

      logger.info("Agent disconnected successfully", { connectionId });
    } catch (error) {
      logger.error("Failed to disconnect agent", { connectionId, error });

      throw new ACPError(
        ErrorCode.SystemError,
        `Failed to disconnect from agent`,
        error instanceof Error ? error.message : "Unknown disconnection error",
        { connectionId, originalError: error },
      );
    }
  }

  /**
   * Get a specific connection by ID
   */
  async getConnection(connectionId: string): Promise<AgentConnection | null> {
    const connection = this.activeConnections.get(connectionId);

    if (!connection) {
      // Try to get from ACP client in case it's not in our cache
      try {
        const clientConnection = await this.acpClient.getConnection(connectionId);
        if (clientConnection) {
          const normalized = this.cloneConnection(clientConnection);
          this.activeConnections.set(connectionId, normalized);
          return normalized;
        }
      } catch (error) {
        logger.debug("Connection not found in client", {
          connectionId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return connection || null;
  }

  /**
   * Get all active connections
   */
  async getActiveConnections(): Promise<AgentConnection[]> {
    try {
      // Get fresh list from ACP client
      const clientConnections = await this.acpClient.getActiveConnections();
      const normalizedConnections = clientConnections.map(this.cloneConnection);

      // Update our cache
      for (const connection of normalizedConnections) {
        this.activeConnections.set(connection.id, connection);
      }

      // Remove stale connections from cache
      for (const [id] of this.activeConnections.entries()) {
        if (!normalizedConnections.find((c: AgentConnection) => c.id === id)) {
          this.activeConnections.delete(id);
        }
      }

      return Array.from(this.activeConnections.values()).filter((conn) => conn.status === "connected");
    } catch (error) {
      logger.error("Failed to get active connections", { error });

      throw new ACPError(
        ErrorCode.SystemError,
        "Failed to retrieve active connections",
        error instanceof Error ? error.message : "Unknown error",
        { originalError: error },
      );
    }
  }

  /**
   * Check connection health
   */
  async getConnectionHealth(connectionId: string): Promise<ConnectionHealth> {
    const startTime = Date.now();

    try {
      logger.debug("Checking connection health", { connectionId });

      const isHealthy = await this.acpClient.checkConnection(connectionId);
      const responseTime = Date.now() - startTime;

      const health: ConnectionHealth = {
        isHealthy,
        lastChecked: new Date(),
        responseTime,
      };

      if (!isHealthy) {
        health.error = "Connection check failed";

        // Update connection status if we have it cached
        const connection = this.activeConnections.get(connectionId);
        if (connection) {
          connection.status = "error";
          connection.error = {
            code: "CONNECTION_UNHEALTHY",
            message: "Health check failed",
          };
        }
      }

      logger.debug("Health check completed", {
        connectionId,
        isHealthy,
        responseTime,
      });

      return health;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.warn("Health check error", { connectionId, error, responseTime });

      return {
        isHealthy: false,
        lastChecked: new Date(),
        responseTime,
        error: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  /**
   * Reconnect to an agent
   */
  async reconnectAgent(connectionId: string): Promise<AgentConnection> {
    logger.info("Reconnecting to agent", { connectionId });

    try {
      // Get the existing connection to find the agent config
      const existingConnection = await this.getConnection(connectionId);
      if (!existingConnection) {
        throw new ACPError(
          ErrorCode.SessionNotFound,
          `Connection not found: ${connectionId}`,
          "Cannot reconnect to a connection that does not exist",
          { connectionId },
        );
      }

      // Check if already connected
      if (existingConnection.status === "connected") {
        const health = await this.getConnectionHealth(connectionId);
        if (health.isHealthy !== false) {
          throw new ACPError(
            ErrorCode.InvalidConfiguration,
            "Connection is already active",
            "Cannot reconnect to an active, healthy connection",
            { connectionId },
          );
        }
      }

      // Get agent configuration for reconnection
      const configs = await this.configService.getAgentConfigs();
      const agentConfig = configs.find((config) => config.id === existingConnection.agentId);

      if (!agentConfig) {
        throw new ACPError(
          ErrorCode.InvalidConfiguration,
          `Agent configuration not found for reconnection: ${existingConnection.agentId}`,
          "The agent configuration is no longer available",
          { connectionId, agentId: existingConnection.agentId },
        );
      }

      // Disconnect old connection first
      try {
        await this.disconnectAgent(connectionId);
      } catch (error) {
        logger.warn("Failed to clean up old connection during reconnect", {
          connectionId,
          error,
        });
      }

      // Establish new connection
      const newConnection = await this.connectToAgent(existingConnection.agentId);
      const normalized = this.cloneConnection(newConnection);

      logger.info("Agent reconnected successfully", {
        oldConnectionId: connectionId,
        newConnectionId: normalized.id,
        agentId: existingConnection.agentId,
      });

      return normalized;
    } catch (error) {
      logger.error("Failed to reconnect agent", { connectionId, error });

      if (error instanceof ACPError) {
        throw error;
      }

      throw new ACPError(
        ErrorCode.AgentConnectionFailed,
        "Failed to reconnect to agent",
        error instanceof Error ? error.message : "Unknown reconnection error",
        { connectionId, originalError: error },
      );
    }
  }

  /**
   * Start periodic health monitoring for all connections
   */
  private startHealthMonitoring(): void {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const connections = await this.getActiveConnections();

        for (const connection of connections) {
          if (connection.status === "connected") {
            try {
              await this.getConnectionHealth(connection.id);
            } catch (error) {
              logger.warn("Periodic health check failed", {
                connectionId: connection.id,
                error,
              });
            }
          }
        }
      } catch (error) {
        logger.error("Health monitoring error", { error });
      }
    }, 30000);

    logger.info("Health monitoring started");
  }

  private cloneConnection(connection: AgentConnection): AgentConnection {
    return {
      ...connection,
      connectedAt: new Date(connection.connectedAt),
      lastActivity: new Date(connection.lastActivity),
      status: connection.status,
    };
  }

  /**
   * Stop health monitoring
   */
  public stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval as unknown as NodeJS.Timeout);
      this.healthCheckInterval = null;
      logger.info("Health monitoring stopped");
    }
  }

  /**
   * Clean up all connections and stop monitoring
   */
  public async cleanup(): Promise<void> {
    logger.info("Cleaning up agent service");

    this.stopHealthMonitoring();

    // Disconnect all active connections
    const connectionIds = Array.from(this.activeConnections.keys());
    await Promise.allSettled(connectionIds.map((id) => this.disconnectAgent(id)));

    this.activeConnections.clear();
    logger.info("Agent service cleanup completed");
  }
}
