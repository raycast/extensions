import WebSocket from "ws";
import { EventEmitter } from "events";
import { HarmonyHub, HarmonyDevice, HarmonyActivity } from "../../types/harmony";
import { Logger } from "../logger";
import { HarmonyError, ErrorCategory } from "../../types/errors";
import {
  WebSocketMessageType,
  WebSocketMessage,
  WebSocketMessageUnion,
  WebSocketResponse,
  WebSocketConnectionStatus,
  WebSocketEventHandler,
  WebSocketErrorHandler,
  ActivitiesResponse,
  DevicesResponse,
  CommandPayload,
  ActivityPayload
} from "../../types/websocket";

// Constants for WebSocket management
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 1000;
const CONNECTION_TIMEOUT = 5000;
const PING_INTERVAL = 30000;
const MESSAGE_TIMEOUT = 5000;

/**
 * Interface for queued messages
 */
interface QueuedMessage<T = unknown> {
  /** Unique message identifier */
  id: string;
  /** Message type */
  type: WebSocketMessageType;
  /** Message payload */
  payload: T;
  /** Promise resolve function */
  resolve: (value: WebSocketResponse<T>) => void;
  /** Promise reject function */
  reject: (error: Error) => void;
  /** Message timestamp */
  timestamp: number;
  /** Message timeout */
  timeout?: NodeJS.Timeout;
}

/**
 * WebSocket client for communicating with Harmony Hub.
 * Handles connection management, message queuing, and event handling.
 */
export class HarmonyWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private messageQueue: QueuedMessage[] = [];
  private status: WebSocketConnectionStatus = WebSocketConnectionStatus.DISCONNECTED;
  private eventHandler?: WebSocketEventHandler;
  private errorHandler?: WebSocketErrorHandler;
  private reconnectAttempts = 0;
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
    devices: []
  };

  constructor(private readonly hub: HarmonyHub) {
    super();
    Logger.debug("HarmonyWebSocket constructor called for hub:", hub.name);
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketConnectionStatus {
    return this.status;
  }

  /**
   * Connect to the Harmony Hub
   */
  async connect(): Promise<void> {
    if (this.ws) {
      Logger.debug("WebSocket already exists, cleaning up...");
      this.cleanup();
    }

    if (this.connectPromise) {
      Logger.debug("Connection already in progress, returning existing promise");
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      try {
        Logger.debug(`Creating WebSocket connection to ${this.hub.ip}`);
        this.status = WebSocketConnectionStatus.CONNECTING;
        this.ws = new WebSocket(`ws://${this.hub.ip}:${this.hub.port || 8088}`);

        // Set up connection timeout
        const timeout = setTimeout(() => {
          if (this.status === WebSocketConnectionStatus.CONNECTING) {
            const error = new HarmonyError(
              "WebSocket connection timeout",
              ErrorCategory.WEBSOCKET
            );
            this.handleError(error);
          }
        }, CONNECTION_TIMEOUT);

        this.ws.on("open", () => {
          Logger.debug("WebSocket connection opened");
          clearTimeout(timeout);
          this.status = WebSocketConnectionStatus.CONNECTED;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.processQueue();
          if (this.connectResolve) this.connectResolve();
        });

        this.ws.on("close", () => {
          Logger.debug("WebSocket connection closed");
          this.handleClose();
        });

        this.ws.on("error", (error: Error) => {
          Logger.error("WebSocket error:", error);
          clearTimeout(timeout);
          this.handleError(new HarmonyError(
            "WebSocket error",
            ErrorCategory.WEBSOCKET,
            error
          ));
        });

        this.ws.on("message", (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

      } catch (error) {
        Logger.error("Failed to create WebSocket:", error);
        this.handleError(new HarmonyError(
          "Failed to create WebSocket",
          ErrorCategory.WEBSOCKET,
          error instanceof Error ? error : undefined
        ));
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
        this.handleError(new HarmonyError(
          "WebSocket not ready for ping",
          ErrorCategory.WEBSOCKET
        ));
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
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect().catch(error => {
          Logger.error("Reconnection failed:", error);
          this.handleError(new HarmonyError(
            "Failed to reconnect",
            ErrorCategory.WEBSOCKET,
            error instanceof Error ? error : undefined
          ));
        });
      }, RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts));
    } else {
      const error = new HarmonyError(
        "Maximum reconnection attempts reached",
        ErrorCategory.WEBSOCKET
      );
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
    this.messageQueue.forEach(message => {
      message.reject(new HarmonyError(
        "WebSocket connection closed",
        ErrorCategory.WEBSOCKET
      ));
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
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketResponse<WebSocketMessageUnion>;
      Logger.debug("Received WebSocket message:", message);
      this.handleMessageResponse(message);
    } catch (error) {
      Logger.error("Error parsing WebSocket message:", error);
    }
  }

  private handleMessageResponse(message: WebSocketResponse<WebSocketMessageUnion>): void {
    try {
      const queuedMessage = this.messageQueue.find(m => m.id === message.id);
      if (!queuedMessage) {
        Logger.warn("Received response for unknown message:", message);
        // If no queued message found, treat as event
        if (message.data) {
          this.eventHandler?.(message.data);
        }
        return;
      }

      if (message.status === "error") {
        queuedMessage.reject(new Error(message.error || "Unknown error"));
      } else {
        queuedMessage.resolve(message);
      }

      // Remove from queue
      this.messageQueue = this.messageQueue.filter(m => m.id !== message.id);

      // Process next message if any
      this.processQueue();
    } catch (error) {
      Logger.error("Error handling message:", error);
      if (message.data) {
        this.eventHandler?.(message.data);
      }
    }
  }

  /**
   * Send a message through the WebSocket
   */
  private async sendMessage<T>(
    type: WebSocketMessageType,
    payload: T
  ): Promise<WebSocketResponse<T>> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new HarmonyError(
        "WebSocket not connected",
        ErrorCategory.WEBSOCKET
      );
    }

    return new Promise((resolve, reject) => {
      const message: QueuedMessage<T> = {
        id: Math.random().toString(36).substring(2),
        type,
        payload,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // Set message timeout
      message.timeout = setTimeout(() => {
        this.messageQueue = this.messageQueue.filter(m => m.id !== message.id);
        this.messageTimeouts.delete(message.id);
        reject(new HarmonyError(
          `Message timeout: ${type}`,
          ErrorCategory.WEBSOCKET
        ));
      }, MESSAGE_TIMEOUT);

      this.messageTimeouts.set(message.id, message.timeout);
      this.queueMessage(message);
      try {
        this.ws!.send(JSON.stringify({
          id: message.id,
          type,
          payload
        }));
      } catch (error) {
        clearTimeout(message.timeout);
        this.messageTimeouts.delete(message.id);
        this.messageQueue = this.messageQueue.filter(m => m.id !== message.id);
        reject(new HarmonyError(
          "Failed to send WebSocket message",
          ErrorCategory.WEBSOCKET,
          error instanceof Error ? error : undefined
        ));
      }
    });
  }

  private queueMessage<T>(message: QueuedMessage<T>): void {
    this.messageQueue.push(message as QueuedMessage<unknown>);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue[0];
      try {
        await this.sendMessage(message.type, message.payload);
      } catch (error) {
        Logger.error("Failed to process queued message:", error);
        message.reject(new HarmonyError(
          "Failed to process queued message",
          ErrorCategory.WEBSOCKET,
          error instanceof Error ? error : undefined
        ));
      }
      this.messageQueue.shift();
    }
  }

  /**
   * Set event handler for WebSocket messages
   */
  setEventHandler(handler: WebSocketEventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Set error handler for WebSocket errors
   */
  setErrorHandler(handler: WebSocketErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * Get current activities
   */
  async getActivities(): Promise<HarmonyActivity[]> {
    const response = await this.sendMessage(WebSocketMessageType.GET_ACTIVITIES, {});
    if (response.status === "success" && response.data) {
      this.currentState.activities = response.data as HarmonyActivity[];
      return this.currentState.activities;
    }
    throw new HarmonyError(
      "Failed to get activities",
      ErrorCategory.WEBSOCKET
    );
  }

  /**
   * Get current devices
   */
  async getDevices(): Promise<HarmonyDevice[]> {
    const response = await this.sendMessage(WebSocketMessageType.GET_DEVICES, {});
    if (response.status === "success" && response.data) {
      this.currentState.devices = response.data as HarmonyDevice[];
      return this.currentState.devices;
    }
    throw new HarmonyError(
      "Failed to get devices",
      ErrorCategory.WEBSOCKET
    );
  }

  /**
   * Start an activity
   */
  async startActivity(activityId: string): Promise<void> {
    Logger.debug(`Starting activity: ${activityId}`);
    
    // Create payload with timestamp
    const payload: ActivityPayload = {
      activityId,
      timestamp: Date.now(),
      status: "start"
    };

    // Send start activity command
    const response = await this.sendMessage(WebSocketMessageType.START_ACTIVITY, payload);
    if (response.status !== "success") {
      throw new HarmonyError(
        "Failed to start activity",
        ErrorCategory.WEBSOCKET
      );
    }

    // Wait for activity to start (up to 10 seconds)
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const activities = await this.getActivities();
      const activity = activities.find(a => a.id === activityId);
      
      if (activity?.isCurrent) {
        Logger.debug(`Activity ${activityId} started successfully`);
        this.currentActivity = activityId;
        return;
      }

      Logger.debug(`Waiting for activity ${activityId} to start (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new HarmonyError(
      "Activity start timeout",
      ErrorCategory.WEBSOCKET
    );
  }

  /**
   * Stop current activity
   */
  async stopActivity(): Promise<void> {
    if (!this.currentActivity) {
      throw new HarmonyError(
        "No activity is currently running",
        ErrorCategory.STATE
      );
    }

    Logger.debug(`Stopping activity: ${this.currentActivity}`);
    
    // Create payload with timestamp
    const payload: ActivityPayload = {
      activityId: this.currentActivity,
      timestamp: Date.now(),
      status: "stop"
    };

    // Send stop activity command
    const response = await this.sendMessage(WebSocketMessageType.STOP_ACTIVITY, payload);
    if (response.status !== "success") {
      throw new HarmonyError(
        "Failed to stop activity",
        ErrorCategory.WEBSOCKET
      );
    }

    // Wait for activity to stop (up to 10 seconds)
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const activities = await this.getActivities();
      const activity = activities.find(a => a.id === this.currentActivity);
      
      if (!activity?.isCurrent) {
        Logger.debug(`Activity ${this.currentActivity} stopped successfully`);
        this.currentActivity = null;
        return;
      }

      Logger.debug(`Waiting for activity ${this.currentActivity} to stop (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new HarmonyError(
      "Activity stop timeout",
      ErrorCategory.WEBSOCKET
    );
  }

  /**
   * Execute a command
   */
  async executeCommand(deviceId: string, command: string): Promise<void> {
    const payload: CommandPayload = { deviceId, command };
    const response = await this.sendMessage(WebSocketMessageType.EXECUTE_COMMAND, payload);
    if (response.status !== "success") {
      throw new HarmonyError(
        "Failed to execute command",
        ErrorCategory.WEBSOCKET
      );
    }
  }

  /**
   * Disconnect from the Harmony Hub
   */
  disconnect(): void {
    Logger.debug("Disconnecting from Harmony Hub");
    this.cleanup();
  }
}
