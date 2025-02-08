/**
 * WebSocket-related types for Harmony Hub communication.
 * @module
 */

import { HarmonyError } from "./errors";
import { HarmonyActivity, HarmonyDevice } from "./harmony";

/**
 * WebSocket connection status
 * @enum {string}
 */
export enum WebSocketConnectionStatus {
  /** The WebSocket connection is closed. */
  DISCONNECTED = "disconnected",
  /** The WebSocket connection is being established. */
  CONNECTING = "connecting",
  /** The WebSocket connection is established. */
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
  type: WebSocketMessageType;
  /** Payload of the message */
  payload: T;
}

/**
 * Payload for command execution requests
 * @interface CommandPayload
 */
export interface CommandPayload {
  /** Device to send command to */
  deviceId: string;
  /** Command to execute */
  command: string;
}

/**
 * Payload for activity control requests
 * @interface ActivityPayload
 */
export interface ActivityPayload {
  /** Activity to control */
  activityId: string;
  /** Optional timestamp */
  timestamp?: number;
  /** Optional status */
  status?: string;
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
  id: string;
  /** Status of the response */
  status: "success" | "error";
  /** Optional response data */
  data?: T;
  /** Optional error information */
  error?: string;
}

/**
 * Activity response interface
 * @interface ActivitiesResponse
 */
export interface ActivitiesResponse extends WebSocketResponse<HarmonyActivity[]> {
  /** List of activities */
  activities: Array<{
    /** Activity ID */
    id: string;
    /** Activity name */
    name: string;
    /** Activity type */
    type: string;
    /** Whether this activity is currently active */
    isCurrent: boolean;
  }>;
}

/**
 * Device response interface
 * @interface DevicesResponse
 */
export interface DevicesResponse extends WebSocketResponse<HarmonyDevice[]> {
  /** List of devices */
  devices: Array<{
    /** Device ID */
    id: string;
    /** Device name */
    name: string;
    /** Device type */
    type: string;
    /** Device commands */
    commands: Array<{
      /** Command ID */
      id: string;
      /** Command name */
      name: string;
      /** Command label */
      label: string;
      /** Command group */
      group?: string;
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
  id: string;
  /** Resolve function for the message */
  resolve: (value: WebSocketResponse<T>) => void;
  /** Reject function for the message */
  reject: (error: Error) => void;
  /** Timestamp for the message */
  timestamp: number;
}
