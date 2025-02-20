/**
 * WebSocket-related type definitions for Harmony Hub integration
 * @module
 */

import { HarmonyActivity, HarmonyDevice } from "./harmony";

/**
 * WebSocket connection status
 * @enum {string}
 */
export enum WebSocketConnectionStatus {
  /** The WebSocket connection is closed */
  DISCONNECTED = "disconnected",
  /** The WebSocket connection is being established */
  CONNECTING = "connecting",
  /** The WebSocket connection is established */
  CONNECTED = "connected",
}

/**
 * WebSocket message types for Harmony Hub communication
 * @enum {string}
 */
export enum WebSocketMessageType {
  /** Request to start an activity */
  START_ACTIVITY = "startActivity",
  /** Request to stop an activity */
  STOP_ACTIVITY = "stopActivity",
  /** Request to get activities */
  GET_ACTIVITIES = "getactivities",
  /** Request to get devices */
  GET_DEVICES = "getdevices",
  /** Request to execute a command */
  EXECUTE_COMMAND = "executecommand",
}

/**
 * Base interface for all WebSocket messages
 * @interface WebSocketMessage
 */
export interface WebSocketMessage<T = unknown> {
  /** Type of the message */
  readonly type: WebSocketMessageType;
  /** Payload of the message */
  readonly payload: T;
}

/**
 * Payload for command execution requests
 * @interface CommandPayload
 */
export interface CommandPayload {
  /** Device to send command to */
  readonly deviceId: string;
  /** Command to execute */
  readonly command: string;
}

/**
 * Payload for activity control requests
 * @interface ActivityPayload
 */
export interface ActivityPayload {
  /** Activity to control */
  readonly activityId: string;
  /** Optional timestamp */
  readonly timestamp?: number;
  /** Optional status */
  readonly status?: string;
}

/**
 * Union type of all possible WebSocket messages
 * @type {WebSocketMessageUnion}
 */
export type WebSocketMessageUnion =
  | WebSocketMessage<ActivityPayload>
  | WebSocketMessage<CommandPayload>
  | WebSocketMessage<Record<string, never>>;

/**
 * WebSocket response interface
 * @interface WebSocketResponse
 */
export interface WebSocketResponse<T> {
  /** Unique identifier for the response */
  readonly id: string;
  /** Status of the response */
  readonly status: "success" | "error";
  /** Optional response data */
  readonly data?: T;
  /** Optional error information */
  readonly error?: string;
}

/**
 * Activity response interface
 * @interface ActivitiesResponse
 */
export interface ActivitiesResponse extends WebSocketResponse<HarmonyActivity[]> {
  /** List of activities */
  readonly activities: Array<{
    /** Activity ID */
    readonly id: string;
    /** Activity name */
    readonly name: string;
    /** Activity type */
    readonly type: string;
    /** Whether this activity is currently active */
    readonly isCurrent: boolean;
  }>;
}

/**
 * Device response interface
 * @interface DevicesResponse
 */
export interface DevicesResponse extends WebSocketResponse<HarmonyDevice[]> {
  /** List of devices */
  readonly devices: Array<{
    /** Device ID */
    readonly id: string;
    /** Device name */
    readonly name: string;
    /** Device type */
    readonly type: string;
    /** Device commands */
    readonly commands: Array<{
      /** Command ID */
      readonly id: string;
      /** Command name */
      readonly name: string;
      /** Command label */
      readonly label: string;
      /** Command group */
      readonly group?: string;
    }>;
  }>;
}

/**
 * WebSocket event handler type
 * @type {WebSocketEventHandler}
 */
export type WebSocketEventHandler = (message: WebSocketMessageUnion) => void;

/**
 * WebSocket error handler type
 * @type {WebSocketErrorHandler}
 */
export type WebSocketErrorHandler = (error: Error) => void;

/**
 * Queued message interface
 * @interface QueuedMessage
 */
export interface QueuedMessage<T> {
  /** Unique identifier for the message */
  readonly id: string;
  /** Resolve function for the message */
  readonly resolve: (value: WebSocketResponse<T>) => void;
  /** Reject function for the message */
  readonly reject: (error: Error) => void;
  /** Timestamp for the message */
  readonly timestamp: number;
}
