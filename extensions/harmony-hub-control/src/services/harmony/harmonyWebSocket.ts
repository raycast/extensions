import { WebSocket } from "ws";
import type { Data } from "ws";

import { HarmonyError, ErrorCategory } from "../../types/errors";
import { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand } from "../../types/harmony";
import {
  WebSocketConnectionStatus,
  WebSocketResponse,
  WebSocketEventHandler,
  WebSocketErrorHandler,
  WebSocketMessageType,
  WebSocketMessageUnion,
  ActivityPayload,
  CommandPayload,
  WebSocketMessageEvent,
} from "../../types/websocket";
import { Logger } from "../logger";

// Constants for WebSocket management
const MAX_RECONNECT_ATTEMPTS: number = 3;
const RECONNECT_DELAY: number = 1000;
const CONNECTION_TIMEOUT: number = 5000;
const PING_INTERVAL: number = 30000;
const MESSAGE_TIMEOUT: number = 5000;

/**
 * Interface for queued messages
 */
interface QueuedMessage {
  /** Unique message identifier */
  id: string;
  /** Message type */
  type: WebSocketMessageType;
  /** Message payload */
  payload: WebSocketMessageUnion;
  /** Promise resolve function */
  resolve: (value: WebSocketResponse<WebSocketMessageUnion>) => void;
  /** Promise reject function */
  reject: (error: Error) => void;
  /** Message timestamp */
  timestamp: number;
  /** Message timeout */
  timeout: number;
}

/**
 * WebSocket client for communicating with Harmony Hub.
 * Handles connection management, message queuing, and event handling.
 */
export class HarmonyWebSocket {
  private ws: WebSocket | null = null;
  private messageQueue: QueuedMessage[] = [];
  private status: WebSocketConnectionStatus = WebSocketConnectionStatus.DISCONNECTED;
  private eventHandler?: WebSocketEventHandler;
  private errorHandler?: WebSocketErrorHandler;
  private reconnectAttempts: number = 0;
  private pingInterval?: NodeJS.Timeout;
  private messageTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private connectPromise: Promise<void> | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((error: Error) => void) | null = null;
  private currentActivity: string | null = null;
  private currentState: {
    activities: HarmonyActivity[];
    devices: HarmonyDevice[];
  } = {
    activities: [],
    devices: [],
  };

  constructor(private readonly hubInfo: HarmonyHub) {
    Logger.debug("HarmonyWebSocket constructor called for hub:", hubInfo.name);
  }

  /**
   * Get current connection status
   */
  public getStatus(): WebSocketConnectionStatus {
    return this.status;
  }

  /**
   * Connect to the Harmony Hub
   */
  public async connect(): Promise<void> {
    if (this.ws) {
      return;
    }

    if (this.connectPromise) {
      Logger.debug("Connection already in progress, returning existing promise");
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      try {
        Logger.debug(`Creating WebSocket connection to ${this.hubInfo.ip}`);
        this.status = WebSocketConnectionStatus.CONNECTING;
        this.ws = new WebSocket(`ws://${this.hubInfo.ip}:${this.hubInfo.remoteId}`);

        // Set up connection timeout
        const timeout: NodeJS.Timeout = setTimeout(() => {
          if (this.status === WebSocketConnectionStatus.CONNECTING) {
            const error: HarmonyError = new HarmonyError("WebSocket connection timeout", ErrorCategory.WEBSOCKET);
            this.handleError(error);
          }
        }, CONNECTION_TIMEOUT);

        this.ws.on("open", this.handleOpen.bind(this));
        this.ws.on("close", this.handleClose.bind(this));
        this.ws.on("error", this.handleError.bind(this));
        this.ws.on("message", this.handleMessage.bind(this));

        // Wait for connection
        this.ws?.once("open", () => {
          clearTimeout(timeout);
          if (this.connectResolve) this.connectResolve();
        });

        this.ws?.once("error", (error: Error) => {
          clearTimeout(timeout);
          this.handleError(error);
        });
      } catch (err: unknown) {
        const error: Error = err instanceof Error ? err : new Error(String(err));
        this.handleError(
          new HarmonyError(
            "Failed to connect to WebSocket",
            ErrorCategory.WEBSOCKET,
            error instanceof Error ? error : undefined,
          ),
        );
      }
    });

    return this.connectPromise;
  }

  /**
   * Start the ping interval to keep connection alive
   */
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      } else {
        this.handleError(new HarmonyError("WebSocket not ready for ping", ErrorCategory.WEBSOCKET));
      }
    }, PING_INTERVAL);
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    this.cleanup();

    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      Logger.debug(`Attempting to reconnect (${this.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(
        () => {
          this.reconnectAttempts++;
          this.connect().catch((error) => {
            Logger.error("Reconnection failed:", error);
            this.handleError(
              new HarmonyError(
                "Failed to reconnect",
                ErrorCategory.WEBSOCKET,
                error instanceof Error ? error : undefined,
              ),
            );
          });
        },
        RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      );
    } else {
      const error: HarmonyError = new HarmonyError("Maximum reconnection attempts reached", ErrorCategory.WEBSOCKET);
      this.handleError(error);
    }
  }

  /**
   * Clean up WebSocket resources
   */
  private cleanup(): void {
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.close();
        }
      } catch (error) {
        Logger.error("Error closing WebSocket:", error);
      }
      this.ws = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }

    // Clear all message timeouts
    for (const timeout of this.messageTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.messageTimeouts.clear();

    // Reject all queued messages
    this.messageQueue.forEach((message) => {
      message.reject(new HarmonyError("WebSocket connection closed", ErrorCategory.WEBSOCKET));
    });
    this.messageQueue = [];

    this.status = WebSocketConnectionStatus.DISCONNECTED;
    this.connectPromise = null;
    this.connectResolve = null;
    this.connectReject = null;
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Error): void {
    Logger.error("WebSocket error:", error);

    if (this.connectReject) {
      this.connectReject(error);
      this.connectReject = null;
    }

    if (this.errorHandler) {
      this.errorHandler(error);
    }

    this.cleanup();
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(data: Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessageEvent;
      Logger.debug("Received WebSocket message:", message);

      if (this.eventHandler) {
        await this.eventHandler(message);
      }

      // Process queued messages
      this.processQueue();
    } catch (error) {
      Logger.error("Failed to handle WebSocket message", { error, data });
      if (this.errorHandler) {
        await this.errorHandler(
          new HarmonyError("Failed to handle WebSocket message", ErrorCategory.WEBSOCKET, error as Error),
        );
      }
    }
  }

  /**
   * Send a message through the WebSocket
   */
  private async sendMessage<T extends WebSocketMessageUnion>(
    type: WebSocketMessageType,
    payload: T,
  ): Promise<WebSocketResponse<T>> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new HarmonyError("WebSocket not connected", ErrorCategory.WEBSOCKET);
    }

    return new Promise((resolve, reject) => {
      const message: Omit<QueuedMessage, "resolve" | "reject"> & {
        resolve: (value: WebSocketResponse<T>) => void;
        reject: (error: Error) => void;
      } = {
        id: Math.random().toString(36).substring(2),
        type,
        payload,
        resolve,
        reject,
        timestamp: Date.now(),
        timeout: MESSAGE_TIMEOUT,
      };

      this.addToQueue(message);
    });
  }

  /**
   * Add a message to the queue and process it
   */
  private addToQueue<T extends WebSocketMessageUnion>(
    message: Omit<QueuedMessage, "resolve" | "reject"> & {
      resolve: (value: WebSocketResponse<T>) => void;
      reject: (error: Error) => void;
    },
  ): void {
    this.messageQueue.push(message as QueuedMessage);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue[0];
      try {
        await this.sendMessage(message.type, message.payload);
      } catch (error) {
        Logger.error("Failed to process queued message:", error);
        message.reject(
          new HarmonyError(
            "Failed to process queued message",
            ErrorCategory.WEBSOCKET,
            error instanceof Error ? error : undefined,
          ),
        );
      }
      this.messageQueue.shift();
    }
  }

  /**
   * Set event handler for WebSocket messages
   */
  public setEventHandler(handler: WebSocketEventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Set error handler for WebSocket errors
   */
  public setErrorHandler(handler: WebSocketErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * Get current activities
   */
  public async getActivities(): Promise<HarmonyActivity[]> {
    Logger.debug("Getting activities");
    const response = await this.sendMessage<WebSocketResponse<HarmonyActivity[]>>(WebSocketMessageType.GET_ACTIVITIES, {
      success: true,
    });
    return Array.isArray(response?.data) ? response.data : [];
  }

  /**
   * Get current devices
   */
  public async getDevices(): Promise<HarmonyDevice[]> {
    Logger.debug("Getting devices");
    const response = await this.sendMessage<WebSocketResponse<HarmonyDevice[]>>(WebSocketMessageType.GET_DEVICES, {
      success: true,
    });
    return Array.isArray(response?.data) ? response.data : [];
  }

  /**
   * Start an activity
   */
  public async startActivity(activityId: string): Promise<void> {
    Logger.debug(`Starting activity: ${activityId}`);
    const payload: ActivityPayload & WebSocketResponse<void> = {
      activityId,
      status: "starting",
      timestamp: Date.now(),
      success: true,
    };
    await this.sendMessage<WebSocketResponse<void>>(WebSocketMessageType.START_ACTIVITY, payload);
  }

  /**
   * Stop current activity
   */
  public async stopActivity(activityId: string): Promise<void> {
    Logger.debug(`Stopping activity: ${activityId}`);
    const payload: ActivityPayload & WebSocketResponse<void> = {
      activityId,
      status: "stopping",
      timestamp: Date.now(),
      success: true,
    };
    await this.sendMessage<WebSocketResponse<void>>(WebSocketMessageType.STOP_ACTIVITY, payload);
  }

  /**
   * Execute a command
   */
  public async executeCommand(deviceId: string, command: HarmonyCommand): Promise<void> {
    Logger.debug(`Executing command: ${command.name} on device: ${deviceId}`);
    const payload: CommandPayload & WebSocketResponse<void> = {
      deviceId,
      command,
      success: true,
    };
    await this.sendMessage<WebSocketResponse<void>>(WebSocketMessageType.EXECUTE_COMMAND, payload);
  }

  /**
   * Disconnect from the Harmony Hub
   */
  public disconnect(): void {
    Logger.debug("Disconnecting from Harmony Hub");
    this.cleanup();
  }

  private handleOpen(): void {
    Logger.debug("WebSocket connection opened");
    this.status = WebSocketConnectionStatus.CONNECTED;
    this.reconnectAttempts = 0;
    this.startPingInterval();
    this.processQueue();
    if (this.connectResolve) this.connectResolve();
  }
}
