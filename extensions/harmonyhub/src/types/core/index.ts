/**
 * Core type definitions for Harmony Hub integration
 * @module
 */

// Base types
export * from "./harmony";
export * from "./errors";
export * from "./validation";
export * from "./command";
export * from "./logging";
export * from "./websocket";
export * from "./state";

// Re-export commonly used types for convenience
export type {
  // Harmony types
  HarmonyHub,
  HarmonyDevice,
  HarmonyActivity,
  HarmonyCommand,
  LoadingState,
  HarmonyMessage,
  MessageHandler,
  HubDiscoveryHandler,
} from "./harmony";

// Re-export commonly used enums
export {
  // Harmony enums
  HarmonyStage,
} from "./state";

// Re-export error types
export { HarmonyError, ErrorCategory, ErrorSeverity, ErrorRecoveryAction } from "./errors";

// Re-export validation functions
export { validateHub, validateDevice, validateCommand, validateActivity, validateLoadingState } from "./validation";

// Re-export command types
export type { CommandQueueConfig, CommandRequest, CommandResult, RetryConfig, TimeoutConfig } from "./command";

export { CommandStatus } from "./command";

// Re-export logging types
export type { LogLevel, LogEntry, LoggerOptions, ILogger, LogFilter, LogFormatter } from "./logging";

// Re-export WebSocket types
export type {
  WebSocketMessage,
  CommandPayload,
  ActivityPayload,
  WebSocketMessageUnion,
  WebSocketResponse,
  ActivitiesResponse,
  DevicesResponse,
  WebSocketEventHandler,
  WebSocketErrorHandler,
  QueuedMessage,
} from "./websocket";

export { WebSocketConnectionStatus, WebSocketMessageType } from "./websocket";

// Re-export state types
export type { View, ViewFilters, ViewActions, MutableViewState } from "./views";

export {
  isHarmonyHub,
  isHarmonyDevice,
  isHarmonyActivity,
  isHarmonyCommand,
  validateHarmonyHub,
  validateHarmonyDevice,
  validateHarmonyActivity,
  validateHarmonyCommand,
} from "./harmony";

export type { HarmonyLoadingState, HarmonyState } from "./state";
