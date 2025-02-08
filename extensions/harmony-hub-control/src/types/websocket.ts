/**
 * WebSocket-related types for Harmony Hub communication.
 * @module
 */

import { HarmonyCommand } from "./harmony";

/**
 * WebSocket connection status
 */
export enum WebSocketConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

/**
 * WebSocket message types
 */
export enum WebSocketMessageType {
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  COMMAND = "command",
  ACTIVITY = "activity",
  ERROR = "error",
  GET_ACTIVITIES = "get_activities",
  GET_DEVICES = "get_devices",
  START_ACTIVITY = "start_activity",
  STOP_ACTIVITY = "stop_activity",
  EXECUTE_COMMAND = "execute_command",
}

/**
 * WebSocket response interface
 */
export interface WebSocketResponse<T = unknown> {
  [key: string]: unknown;
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * WebSocket event handler type
 */
export type WebSocketEventHandler = (event: WebSocketMessageEvent) => Promise<void>;

/**
 * WebSocket error handler type
 */
export type WebSocketErrorHandler = (error: Error) => Promise<void>;

/**
 * WebSocket message event interface
 */
export interface WebSocketMessageEvent {
  type: WebSocketMessageType;
  data: unknown;
}

/**
 * Activity payload interface
 */
export interface ActivityPayload {
  [key: string]: unknown;
  activityId: string;
  status?: "starting" | "stopping";
  timestamp?: number;
}

/**
 * Command payload interface
 */
export interface CommandPayload {
  [key: string]: unknown;
  deviceId: string;
  command: HarmonyCommand;
}

/**
 * Union type for all possible WebSocket message payloads
 */
export type WebSocketMessageUnion =
  | ActivityPayload
  | CommandPayload
  | WebSocketResponse<unknown>
  | Record<string, unknown>;

/**
 * WebSocket configuration interface
 */
export interface WebSocketConfig {
  host: string;
  port: number;
  path: string;
  secure: boolean;
}
