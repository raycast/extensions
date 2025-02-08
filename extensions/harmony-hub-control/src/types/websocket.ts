/**
 * WebSocket-related types for Harmony Hub communication.
 * @module
 */

import { HarmonyCommand } from "./harmony";

/**
 * WebSocket connection status
 */
export enum WebSocketStatus {
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
}

/**
 * Base WebSocket message interface
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload?: unknown;
}

/**
 * Activity payload interface
 */
export interface ActivityPayload {
  activityId: string;
}

/**
 * Command payload interface
 */
export interface CommandPayload {
  deviceId: string;
  command: HarmonyCommand;
}

/**
 * Union type for all possible WebSocket message payloads
 */
export type WebSocketMessageUnion = Record<string, never>;

/**
 * WebSocket configuration interface
 */
export interface WebSocketConfig {
  host: string;
  port: number;
  path: string;
  secure: boolean;
}
