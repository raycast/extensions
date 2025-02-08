/**
 * Types and interfaces for Harmony Hub integration.
 * @module
 */

/**
 * Represents a Logitech Harmony Hub device
 */
export interface HarmonyHub {
  /** Unique identifier for the hub */
  id: string;
  /** User-friendly name of the hub */
  name: string;
  /** Remote ID assigned by Harmony service */
  remoteId?: string;
  /** IP address of the hub on the local network */
  ip: string;
  /** Hub ID from Logitech service */
  hubId?: string;
  /** Version of the hub firmware */
  version?: string;
  /** Port number for hub communication */
  port?: string;
  /** Product ID of the hub */
  productId?: string;
  /** Protocol versions supported by the hub */
  protocolVersion?: string;
}

/**
 * Represents a device controlled by the Harmony Hub
 */
export interface HarmonyDevice {
  /** Unique identifier for the device */
  id: string;
  /** User-friendly name of the device */
  name: string;
  /** Type of device (e.g., TV, Receiver) */
  type: string;
  /** Available commands for this device */
  commands: HarmonyCommand[];
}

/**
 * Represents a command that can be sent to a device
 */
export interface HarmonyCommand {
  /** Command identifier */
  id: string;
  /** Command name */
  name: string;
  /** User-friendly label */
  label: string;
  /** ID of the device this command belongs to */
  deviceId: string;
  /** Optional command group for categorization */
  group?: string;
}

/**
 * Command queue configuration
 */
export interface CommandQueueConfig {
  /** Maximum number of commands that can be queued */
  maxQueueSize?: number;
  /** Maximum number of commands that can run concurrently */
  maxConcurrent?: number;
  /** Default timeout for command execution in milliseconds */
  defaultTimeout?: number;
  /** Default number of retries for failed commands */
  defaultRetries?: number;
  /** Delay between commands in milliseconds */
  commandDelay?: number;
}

/**
 * Represents an activity configured on the Harmony Hub
 */
export interface HarmonyActivity {
  /** Activity identifier */
  id: string;
  /** User-friendly name */
  name: string;
  /** Type of activity */
  type: string;
  /** Whether this is the current activity */
  isCurrent: boolean;
}

/**
 * Stage of the Harmony Hub connection process
 */
export enum HarmonyStage {
  /** Initial state */
  INITIAL = "initial",
  /** Discovering hubs */
  DISCOVERING = "discovering",
  /** Connecting to hub */
  CONNECTING = "connecting",
  /** Loading devices */
  LOADING_DEVICES = "loading_devices",
  /** Loading activities */
  LOADING_ACTIVITIES = "loading_activities",
  /** Starting activity */
  STARTING_ACTIVITY = "starting_activity",
  /** Stopping activity */
  STOPPING_ACTIVITY = "stopping_activity",
  /** Executing command */
  EXECUTING_COMMAND = "executing_command",
  /** Refreshing state */
  REFRESHING = "refreshing",
  /** Connected and ready */
  CONNECTED = "connected",
  /** Error state */
  ERROR = "error"
}

/**
 * Loading state information
 */
export interface LoadingState {
  /** Current stage of the process */
  stage: HarmonyStage;
  /** Progress from 0 to 1 */
  progress: number;
  /** User-friendly message */
  message: string;
}

/**
 * Current state of the Harmony Hub system
 */
export interface HarmonyState {
  /** Available Harmony Hubs */
  hubs: HarmonyHub[];
  /** Currently selected hub */
  selectedHub: HarmonyHub | null;
  /** Available devices */
  devices: HarmonyDevice[];
  /** Available activities */
  activities: HarmonyActivity[];
  /** Currently running activity */
  currentActivity: HarmonyActivity | null;
  /** Current error if any */
  error: Error | null;
  /** Current loading state */
  loadingState: LoadingState;
}

/**
 * Error categories for Harmony operations
 */
export enum ErrorCategory {
  /** Network or connectivity errors */
  CONNECTION = "connection",
  /** Hub discovery errors */
  DISCOVERY = "discovery",
  /** Command execution errors */
  COMMAND = "command",
  /** State management errors */
  STATE = "state",
  /** Data retrieval or parsing errors */
  DATA = "data"
}

import { WebSocket } from "ws";

/**
 * WebSocket message format from Harmony Hub
 */
export interface HarmonyMessage {
  type: string;
  data?: {
    id?: string;
    status?: string;
    errorCode?: string;
    errorMessage?: string;
    [key: string]: unknown;
  };
}

/**
 * Message handler type.
 */
export type MessageHandler = (message: HarmonyMessage) => void;

/**
 * Error handler type.
 */
export type ErrorHandler = (error: Error) => void;

/**
 * Hub discovery handler type.
 */
export type HubDiscoveryHandler = (hub: HarmonyHub) => void;

/**
 * Status of a command in the queue
 */
export enum CommandStatus {
  /** Command is queued for execution */
  QUEUED = "QUEUED",
  /** Command is pending execution */
  PENDING = "PENDING",
  /** Command is currently executing */
  EXECUTING = "EXECUTING",
  /** Command has completed successfully */
  COMPLETED = "COMPLETED",
  /** Command has failed */
  FAILED = "FAILED",
  /** Command was cancelled */
  CANCELLED = "CANCELLED"
}

/**
 * Command request for the queue
 */
export interface CommandRequest {
  /** Unique identifier for the command request */
  id: string;
  /** Command to execute */
  command: HarmonyCommand;
  /** Timestamp when the request was created */
  timestamp: number;
  /** Optional timeout in milliseconds */
  timeout?: number;
  /** Optional number of retries */
  retries?: number;
  /** Optional callback when command completes successfully */
  onComplete?: () => void;
  /** Optional callback when command fails */
  onError?: (error: Error) => void;
}

/**
 * Result of a command execution
 */
export interface CommandResult {
  /** Unique identifier matching the request */
  id: string;
  /** Command that was executed */
  command: HarmonyCommand;
  /** Current status of the command */
  status: CommandStatus;
  /** Error if command failed */
  error?: Error;
  /** When the command was queued */
  queuedAt: number;
  /** When the command started executing */
  startedAt?: number;
  /** When the command completed (success or failure) */
  completedAt?: number;
}
