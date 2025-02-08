import WebSocket from "ws";
import { Logger } from "../logger";
import { HarmonyError, ErrorCategory } from "../../types/errors";
import { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand } from "../../types/harmony";
import {
  WebSocketConnectionStatus,
  WebSocketMessageType,
  WebSocketResponse,
  WebSocketEventHandler,
  WebSocketErrorHandler as WebSocketErrorHandlerType,
  WebSocketMessageUnion,
  ActivityPayload,
  CommandPayload,
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
  private errorHandler?: WebSocketErrorHandlerType;
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
    devices: [],
  };

  constructor(private readonly hubInfo: HarmonyHub) {
    Logger.debug("HarmonyWebSocket constructor called for hub:", hubInfo.name);
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
        const timeout = setTimeout(() => {
          if (this.status === WebSocketConnectionStatus.CONNECTING) {
            const error = new HarmonyError("WebSocket connection timeout", ErrorCategory.WEBSOCKET);
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
        const error = err instanceof Error ? err : new Error(String(err));
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
      const error = new HarmonyError("Maximum reconnection attempts reached", ErrorCategory.WEBSOCKET);
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
  private async handleMessage(data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessageUnion;
      Logger.debug("Received WebSocket message:", message);

      if (this.eventHandler) {
        this.eventHandler(message);
      }

      // Process queued messages
      this.processQueue();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error("Failed to handle WebSocket message:", error);
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
  setEventHandler(handler: WebSocketEventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Set error handler for WebSocket errors
   */
  setErrorHandler(handler: WebSocketErrorHandlerType): void {
    this.errorHandler = handler;
  }

  /**
   * Get current activities
   */
  async getActivities(): Promise<HarmonyActivity[]> {
    const response = await this.sendMessage<Record<string, never>>(WebSocketMessageType.GET_ACTIVITIES, {});
    if (response.status === "success" && Array.isArray(response.data)) {
      this.currentState.activities = response.data as HarmonyActivity[];
      return response.data as HarmonyActivity[];
    }
    throw new HarmonyError("Failed to get activities", ErrorCategory.WEBSOCKET);
  }

  /**
   * Get current devices
   */
  async getDevices(): Promise<HarmonyDevice[]> {
    const response = await this.sendMessage<Record<string, never>>(WebSocketMessageType.GET_DEVICES, {});
    if (response.status === "success" && Array.isArray(response.data)) {
      this.currentState.devices = response.data as HarmonyDevice[];
      return response.data as HarmonyDevice[];
    }
    throw new HarmonyError("Failed to get devices", ErrorCategory.WEBSOCKET);
  }

  /**
   * Start an activity
   */
  async startActivity(activityId: string): Promise<void> {
    Logger.debug(`Starting activity: ${activityId}`);

    const payload: ActivityPayload = {
      activityId,
      timestamp: Date.now(),
      status: "starting",
    };

    const response = await this.sendMessage<ActivityPayload>(WebSocketMessageType.START_ACTIVITY, payload);
    if (response.status !== "success") {
      throw new HarmonyError("Failed to start activity", ErrorCategory.WEBSOCKET);
    }

    // Wait for activity to start (up to 10 seconds)
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const activities = await this.getActivities();
      const activity = activities.find((a) => a.id === activityId);

      if (activity?.isCurrent) {
        Logger.debug(`Activity ${activityId} started successfully`);
        this.currentActivity = activityId;
        return;
      }

      Logger.debug(`Waiting for activity ${activityId} to start (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new HarmonyError("Activity start timeout", ErrorCategory.WEBSOCKET);
  }

  /**
   * Stop current activity
   */
  async stopActivity(activityId: string): Promise<void> {
    if (!this.currentActivity) {
      throw new HarmonyError("No activity to stop", ErrorCategory.WEBSOCKET);
    }

    Logger.debug(`Stopping activity: ${this.currentActivity}`);

    const payload: ActivityPayload = {
      activityId,
      timestamp: Date.now(),
      status: "stopping",
    };

    const response = await this.sendMessage<ActivityPayload>(WebSocketMessageType.STOP_ACTIVITY, payload);
    if (response.status !== "success") {
      throw new HarmonyError("Failed to stop activity", ErrorCategory.WEBSOCKET);
    }

    // Wait for activity to stop (up to 10 seconds)
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const activities = await this.getActivities();
      const activity = activities.find((a) => a.id === this.currentActivity);

      if (!activity?.isCurrent) {
        Logger.debug(`Activity ${this.currentActivity} stopped successfully`);
        this.currentActivity = null;
        return;
      }

      Logger.debug(`Waiting for activity ${this.currentActivity} to stop (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new HarmonyError("Activity stop timeout", ErrorCategory.WEBSOCKET);
  }

  /**
   * Execute a command
   */
  async executeCommand(deviceId: string, command: HarmonyCommand): Promise<void> {
    const payload: CommandPayload = {
      deviceId,
      command,
    };

    const response = await this.sendMessage<CommandPayload>(WebSocketMessageType.EXECUTE_COMMAND, payload);
    if (response.status !== "success") {
      throw new HarmonyError("Failed to execute command", ErrorCategory.WEBSOCKET);
    }
  }

  /**
   * Disconnect from the Harmony Hub
   */
  disconnect(): void {
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

type WebSocketErrorHandler = (error: Error) => void;
