/**
 * WebSocket-related types for Harmony Hub communication.
 * @module
 */

import { HarmonyDevice, HarmonyActivity, HarmonyCommand } from "./harmony";

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
 * WebSocket message type
 */
export enum WebSocketMessageType {
  EVENT = "event",
  ERROR = "error",
  REQUEST = "request",
  RESPONSE = "response",
  GET_ACTIVITIES = "getactivities",
  GET_DEVICES = "getdevices",
  START_ACTIVITY = "startactivity",
  STOP_ACTIVITY = "stopactivity",
  EXECUTE_COMMAND = "executecommand",
}

/**
 * WebSocket error
 */
export interface WebSocketError {
  message: string;
  code?: string;
}

/**
 * WebSocket response
 */
export interface WebSocketResponse<T> {
  id: string;
  type: WebSocketMessageType;
  data: T;
  error?: WebSocketError;
  status: "success" | "error";
}

/**
 * Activity payload
 */
export interface ActivityPayload {
  activityId: string;
  timestamp: number;
  status: string;
}

/**
 * Command payload
 */
export interface CommandPayload {
  deviceId: string;
  command: HarmonyCommand;
}

/**
 * WebSocket message union type
 */
export type WebSocketMessageUnion =
  | HarmonyDevice
  | HarmonyActivity
  | HarmonyDevice[]
  | HarmonyActivity[]
  | ActivityPayload
  | CommandPayload
  | Record<string, never>;

/**
 * WebSocket event handler
 */
export type WebSocketEventHandler = (data: WebSocketMessageUnion) => void;

/**
 * WebSocket error handler
 */
export type WebSocketErrorHandler = (error: Error) => void;
