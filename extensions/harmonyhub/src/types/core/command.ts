/**
 * Command-related type definitions for Harmony Hub integration
 * @module
 */

import { ErrorCategory } from "./harmony";

/**
 * Status of a command in the queue
 * @enum {string}
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
  CANCELLED = "CANCELLED",
}

/**
 * Command queue configuration
 * @interface CommandQueueConfig
 */
export interface CommandQueueConfig {
  /** Maximum number of commands that can be queued */
  readonly maxQueueSize?: number;
  /** Maximum number of commands that can run concurrently */
  readonly maxConcurrent?: number;
  /** Default timeout for command execution in milliseconds */
  readonly defaultTimeout?: number;
  /** Default number of retries for failed commands */
  readonly defaultRetries?: number;
  /** Delay between commands in milliseconds */
  readonly commandDelay?: number;
}

/**
 * Command request for the queue
 * @interface CommandRequest
 */
export interface CommandRequest {
  /** Unique identifier for the command request */
  readonly id: string;
  /** Command to execute */
  readonly command: import("./harmony").HarmonyCommand;
  /** Timestamp when the request was created */
  readonly timestamp: number;
  /** Optional timeout in milliseconds */
  readonly timeout?: number;
  /** Optional number of retries */
  readonly retries?: number;
  /** Optional callback when command completes successfully */
  readonly onComplete?: () => void;
  /** Optional callback when command fails */
  readonly onError?: (error: Error) => void;
}

/**
 * Result of a command execution
 * @interface CommandResult
 */
export interface CommandResult {
  /** Unique identifier matching the request */
  readonly id: string;
  /** Command that was executed */
  readonly command: import("./harmony").HarmonyCommand;
  /** Current status of the command */
  readonly status: CommandStatus;
  /** Error if command failed */
  readonly error?: Error;
  /** When the command was queued */
  readonly queuedAt: number;
  /** When the command started executing */
  readonly startedAt?: number;
  /** When the command completed (success or failure) */
  readonly completedAt?: number;
}

/**
 * Retry configuration for error handling
 * @interface RetryConfig
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  readonly maxAttempts: number;
  /** Base delay between retries in milliseconds */
  readonly baseDelay: number;
  /** Maximum delay between retries in milliseconds */
  readonly maxDelay: number;
  /** Whether to use exponential backoff */
  readonly useExponentialBackoff: boolean;
  /** Categories to never retry */
  readonly nonRetryableCategories?: ErrorCategory[];
  /** Maximum total retry duration in milliseconds */
  readonly maxRetryDuration?: number;
}

/**
 * Timeout configuration for operations
 * @interface TimeoutConfig
 */
export interface TimeoutConfig {
  /** Connection timeout in milliseconds */
  readonly connection: number;
  /** Message timeout in milliseconds */
  readonly message: number;
  /** Activity timeout in milliseconds */
  readonly activity: number;
  /** Command timeout in milliseconds */
  readonly command: number;
  /** Discovery timeout in milliseconds */
  readonly discovery: number;
  /** Cache timeout in milliseconds */
  readonly cache: number;
}
