/**
 * Core type definitions for Harmony Hub integration
 * @module
 */

import { debug } from "../../services/logger";

/** Re-export ErrorCategory for backwards compatibility */
export { ErrorCategory } from "./errors";

/**
 * Represents a Logitech Harmony Hub device on the network
 * @interface HarmonyHub
 */
export interface HarmonyHub {
  /** Unique identifier for the hub */
  readonly id: string;
  /** User-friendly name of the hub */
  readonly name: string;
  /** IP address of the hub on the local network */
  readonly ip: string;
  /** Remote ID assigned by Harmony service */
  readonly remoteId: string;
  /** Hub ID from Logitech service */
  readonly hubId: string;
  /** Version of the hub firmware */
  readonly version: string;
  /** Port number for hub communication */
  readonly port: string;
  /** Product ID of the hub */
  readonly productId: string;
  /** Protocol versions supported by the hub */
  readonly protocolVersion: string;
}

/**
 * Represents a device that can be controlled by the Harmony Hub
 * @interface HarmonyDevice
 */
export interface HarmonyDevice {
  /** Unique identifier for the device */
  readonly id: string;
  /** User-friendly name of the device */
  readonly name: string;
  /** Type of device (e.g., TV, Receiver, etc.) */
  readonly type: string;
  /** Available commands for this device */
  readonly commands: readonly HarmonyCommand[];
}

/**
 * Represents a command that can be sent to a device
 * @interface HarmonyCommand
 */
export interface HarmonyCommand {
  /** Unique identifier for the command */
  readonly id: string;
  /** Internal name of the command */
  readonly name: string;
  /** User-friendly label for display */
  readonly label: string;
  /** ID of the device this command belongs to */
  readonly deviceId: string;
  /** Command group for categorization (e.g., "IRCommand", "PowerToggle", etc.) */
  readonly group?: string;
}

/**
 * Represents an activity configured on the Harmony Hub
 * @interface HarmonyActivity
 */
export interface HarmonyActivity {
  /** Unique identifier for the activity */
  readonly id: string;
  /** User-friendly name of the activity */
  readonly name: string;
  /** Type of activity (e.g., "WatchTV", "ListenToMusic", etc.) */
  readonly type: string;
  /** Whether this is the currently running activity */
  readonly isCurrent: boolean;
}

/**
 * Represents the stage of the Harmony Hub connection process
 * @enum {string}
 */
export enum HarmonyStage {
  /** Initial state before any connection attempt */
  INITIAL = "initial",
  /** Actively discovering hubs on the network */
  DISCOVERING = "discovering",
  /** Establishing connection to a specific hub */
  CONNECTING = "connecting",
  /** Loading device information from the hub */
  LOADING_DEVICES = "loading_devices",
  /** Loading activity information from the hub */
  LOADING_ACTIVITIES = "loading_activities",
  /** Starting a new activity */
  STARTING_ACTIVITY = "starting_activity",
  /** Stopping the current activity */
  STOPPING_ACTIVITY = "stopping_activity",
  /** Executing a device command */
  EXECUTING_COMMAND = "executing_command",
  /** Refreshing hub state */
  REFRESHING = "refreshing",
  /** Successfully connected and ready */
  CONNECTED = "connected",
  /** Error state */
  ERROR = "error",
}

/**
 * Represents the loading state during operations
 * @interface LoadingState
 */
export interface LoadingState {
  /** Current stage of the process */
  readonly stage: HarmonyStage;
  /** Progress from 0 to 1 */
  readonly progress: number;
  /** User-friendly message about the current state */
  readonly message: string;
}

/**
 * Configuration for operation timeouts
 */
export interface TimeoutConfig {
  /** Timeout for network operations in milliseconds */
  connection: number;
  /** Timeout for message operations in milliseconds */
  message: number;
  /** Timeout for activity operations in milliseconds */
  activity: number;
  /** Timeout for command operations in milliseconds */
  command: number;
  /** Timeout for discovery operations in milliseconds */
  discovery: number;
  /** Timeout for cache operations in milliseconds */
  cache: number;
}

/**
 * Type guard to check if an object is a HarmonyHub.
 * Performs detailed validation of all required properties.
 * @param obj The object to check
 * @returns True if the object is a HarmonyHub
 */
export function isHarmonyHub(obj: unknown): obj is HarmonyHub {
  if (typeof obj !== "object" || obj === null) {
    debug("isHarmonyHub validation failed", {
      reason: "Not an object",
      received: typeof obj,
      value: obj,
    });
    return false;
  }

  const hub = obj as Partial<HarmonyHub>;
  const validations = [
    { field: "id", valid: typeof hub.id === "string" && hub.id.length > 0, value: hub.id },
    { field: "name", valid: typeof hub.name === "string" && hub.name.length > 0, value: hub.name },
    { field: "ip", valid: typeof hub.ip === "string" && hub.ip.length > 0, value: hub.ip },
    { field: "hubId", valid: typeof hub.hubId === "string" && hub.hubId.length > 0, value: hub.hubId },
    { field: "remoteId", valid: typeof hub.remoteId === "string", value: hub.remoteId },
    { field: "version", valid: typeof hub.version === "string", value: hub.version },
    { field: "port", valid: typeof hub.port === "string", value: hub.port },
    { field: "productId", valid: typeof hub.productId === "string", value: hub.productId },
    { field: "protocolVersion", valid: typeof hub.protocolVersion === "string", value: hub.protocolVersion },
  ];

  const failures = validations.filter((v) => !v.valid);
  if (failures.length > 0) {
    debug("isHarmonyHub validation failed", {
      failures: failures.map((f) => ({
        field: f.field,
        receivedType: typeof f.value,
        receivedValue: f.value,
      })),
    });
    return false;
  }

  return true;
}

/**
 * Type guard to check if an object is a HarmonyDevice.
 * Performs detailed validation of all required properties.
 * @param obj The object to check
 * @returns True if the object is a HarmonyDevice
 */
export function isHarmonyDevice(obj: unknown): obj is HarmonyDevice {
  if (typeof obj !== "object" || obj === null) {
    debug("isHarmonyDevice validation failed", {
      reason: "Not an object",
      received: typeof obj,
      value: obj,
    });
    return false;
  }

  const device = obj as Partial<HarmonyDevice>;
  const validations = [
    { field: "id", valid: typeof device.id === "string" && device.id.length > 0, value: device.id },
    { field: "name", valid: typeof device.name === "string" && device.name.length > 0, value: device.name },
    { field: "type", valid: typeof device.type === "string" && device.type.length > 0, value: device.type },
    { field: "commands", valid: Array.isArray(device.commands), value: device.commands },
  ];

  const failures = validations.filter((v) => !v.valid);
  if (failures.length > 0) {
    debug("isHarmonyDevice validation failed", {
      failures: failures.map((f) => ({
        field: f.field,
        receivedType: typeof f.value,
        receivedValue: f.value,
      })),
    });
    return false;
  }

  // Validate each command
  if (device.commands) {
    const invalidCommands = device.commands
      .map((cmd, index) => ({
        index,
        command: cmd,
        valid: isHarmonyCommand(cmd),
      }))
      .filter((result) => !result.valid);

    if (invalidCommands.length > 0) {
      debug("isHarmonyDevice validation failed", {
        reason: "Invalid commands",
        invalidCommands: invalidCommands.map((ic) => ({
          index: ic.index,
          command: ic.command,
        })),
      });
      return false;
    }
  }

  return true;
}

/**
 * Type guard to check if an object is a HarmonyCommand.
 * Performs detailed validation of all required properties.
 * @param obj The object to check
 * @returns True if the object is a HarmonyCommand
 */
export function isHarmonyCommand(obj: unknown): obj is HarmonyCommand {
  if (typeof obj !== "object" || obj === null) {
    debug("isHarmonyCommand validation failed", {
      reason: "Not an object",
      received: typeof obj,
      value: obj,
    });
    return false;
  }

  const command = obj as Partial<HarmonyCommand>;
  const validations = [
    { field: "id", valid: typeof command.id === "string" && command.id.length > 0, value: command.id },
    { field: "name", valid: typeof command.name === "string" && command.name.length > 0, value: command.name },
    { field: "label", valid: typeof command.label === "string" && command.label.length > 0, value: command.label },
    {
      field: "deviceId",
      valid: typeof command.deviceId === "string" && command.deviceId.length > 0,
      value: command.deviceId,
    },
  ];

  const failures = validations.filter((v) => !v.valid);
  if (failures.length > 0) {
    debug("isHarmonyCommand validation failed", {
      failures: failures.map((f) => ({
        field: f.field,
        receivedType: typeof f.value,
        receivedValue: f.value,
      })),
    });
    return false;
  }

  // Optional group validation
  if (command.group !== undefined && typeof command.group !== "string") {
    debug("isHarmonyCommand validation failed", {
      reason: "Invalid group type",
      receivedType: typeof command.group,
      receivedValue: command.group,
    });
    return false;
  }

  return true;
}

/**
 * Type guard to check if an object is a HarmonyActivity.
 * Performs detailed validation of all required properties.
 * @param obj The object to check
 * @returns True if the object is a HarmonyActivity
 */
export function isHarmonyActivity(obj: unknown): obj is HarmonyActivity {
  if (typeof obj !== "object" || obj === null) {
    debug("isHarmonyActivity validation failed", {
      reason: "Not an object",
      received: typeof obj,
      value: obj,
    });
    return false;
  }

  const activity = obj as Partial<HarmonyActivity>;
  const validations = [
    { field: "id", valid: typeof activity.id === "string" && activity.id.length > 0, value: activity.id },
    { field: "name", valid: typeof activity.name === "string" && activity.name.length > 0, value: activity.name },
    { field: "type", valid: typeof activity.type === "string" && activity.type.length > 0, value: activity.type },
    { field: "isCurrent", valid: typeof activity.isCurrent === "boolean", value: activity.isCurrent },
  ];

  const failures = validations.filter((v) => !v.valid);
  if (failures.length > 0) {
    debug("isHarmonyActivity validation failed", {
      failures: failures.map((f) => ({
        field: f.field,
        receivedType: typeof f.value,
        receivedValue: f.value,
      })),
    });
    return false;
  }

  return true;
}

/**
 * Validation utility to ensure a HarmonyHub object is valid
 * @param hub The hub object to validate
 * @throws {Error} If the hub object is invalid
 */
export function validateHarmonyHub(hub: HarmonyHub): void {
  if (!isHarmonyHub(hub)) {
    throw new Error("Invalid HarmonyHub object");
  }
}

/**
 * Validation utility to ensure a HarmonyDevice object is valid
 * @param device The device object to validate
 * @throws {Error} If the device object is invalid
 */
export function validateHarmonyDevice(device: HarmonyDevice): void {
  if (!isHarmonyDevice(device)) {
    throw new Error("Invalid HarmonyDevice object");
  }
  device.commands.forEach(validateHarmonyCommand);
}

/**
 * Validation utility to ensure a HarmonyCommand object is valid
 * @param command The command object to validate
 * @throws {Error} If the command object is invalid
 */
export function validateHarmonyCommand(command: HarmonyCommand): void {
  if (!isHarmonyCommand(command)) {
    throw new Error("Invalid HarmonyCommand object");
  }
}

/**
 * Validation utility to ensure a HarmonyActivity object is valid
 * @param activity The activity object to validate
 * @throws {Error} If the activity object is invalid
 */
export function validateHarmonyActivity(activity: HarmonyActivity): void {
  if (!isHarmonyActivity(activity)) {
    throw new Error("Invalid HarmonyActivity object");
  }
}

/**
 * Current state of the Harmony Hub system
 * @interface HarmonyState
 */
export interface HarmonyState {
  /** Available Harmony Hubs */
  readonly hubs: readonly HarmonyHub[];
  /** Currently selected hub */
  readonly selectedHub: HarmonyHub | null;
  /** Available devices */
  readonly devices: readonly HarmonyDevice[];
  /** Available activities */
  readonly activities: readonly HarmonyActivity[];
  /** Currently running activity */
  readonly currentActivity: HarmonyActivity | null;
  /** Current error if any */
  readonly error: Error | null;
  /** Current loading state */
  readonly loadingState: LoadingState;
}

/**
 * WebSocket message format from Harmony Hub
 * @interface HarmonyMessage
 */
export interface HarmonyMessage {
  /** Message type */
  readonly type: string;
  /** Message data */
  readonly data?: {
    /** Message ID */
    readonly id?: string;
    /** Message status */
    readonly status?: string;
    /** Error code if any */
    readonly errorCode?: string;
    /** Error message if any */
    readonly errorMessage?: string;
    /** Additional data fields */
    readonly [key: string]: unknown;
  };
}

/**
 * Message handler type
 */
export type MessageHandler = (message: HarmonyMessage) => void;

/**
 * Hub discovery handler type
 */
export type HubDiscoveryHandler = (hub: HarmonyHub) => void;
