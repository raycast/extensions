/**
 * Type guard utilities
 * Runtime type checking functions
 */

import { Sandbox, SandboxStatus } from "../../types/sandbox";
import { ApiResponse, DaytonaApiSandbox } from "../../types/api";
import { ExecutionError, CodeExecutionResponse } from "../../types/execution";
import { GitStatus, GitCommit, GitBranch } from "../../types/git";

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is a valid date
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a valid date string
 */
export function isValidDateString(value: unknown): value is string {
  return isString(value) && !isNaN(Date.parse(value));
}

/**
 * Check if value is a valid sandbox status
 */
export function isSandboxStatus(value: unknown): value is SandboxStatus {
  return isString(value) && ["running", "stopped", "creating", "deleting", "starting", "stopping"].includes(value);
}

/**
 * Check if value is a valid Sandbox object
 */
export function isSandbox(value: unknown): value is Sandbox {
  if (!isObject(value)) return false;

  return (
    isString(value.id) &&
    isString(value.name) &&
    isSandboxStatus(value.status) &&
    isString(value.createdAt) &&
    (value.repository === undefined || isString(value.repository)) &&
    (value.updatedAt === undefined || isString(value.updatedAt))
  );
}

/**
 * Check if value is a valid Daytona API sandbox response
 */
export function isDaytonaApiSandbox(value: unknown): value is DaytonaApiSandbox {
  if (!isObject(value)) return false;

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.workspaceId) &&
    isString(value.status) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

/**
 * Check if value is a valid API response
 */
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!isObject(value)) return false;

  return (
    isNumber(value.status) &&
    isBoolean(value.success) &&
    (value.error === undefined || isString(value.error)) &&
    (value.message === undefined || isString(value.message))
  );
}

/**
 * Check if value is a valid execution error
 */
export function isExecutionError(value: unknown): value is ExecutionError {
  if (!isObject(value)) return false;

  return (
    isString(value.type) &&
    isString(value.message) &&
    (value.details === undefined || isString(value.details)) &&
    (value.line === undefined || isNumber(value.line)) &&
    (value.column === undefined || isNumber(value.column))
  );
}

/**
 * Check if value is a valid code execution response
 */
export function isCodeExecutionResponse(value: unknown): value is CodeExecutionResponse {
  if (!isObject(value)) return false;

  return isBoolean(value.success) && isString(value.stdout) && isString(value.stderr) && isNumber(value.exitCode);
}

/**
 * Check if value is a valid git status
 */
export function isGitStatus(value: unknown): value is GitStatus {
  if (!isObject(value)) return false;

  return (
    isString(value.branch) &&
    isNumber(value.behind) &&
    isNumber(value.ahead) &&
    isArray(value.staged) &&
    isArray(value.unstaged) &&
    isArray(value.untracked) &&
    isBoolean(value.isClean) &&
    isBoolean(value.hasRemote)
  );
}

/**
 * Check if value is a valid git commit
 */
export function isGitCommit(value: unknown): value is GitCommit {
  if (!isObject(value)) return false;

  return (
    isString(value.hash) &&
    isString(value.message) &&
    isString(value.author) &&
    isString(value.date) &&
    isString(value.shortHash)
  );
}

/**
 * Check if value is a valid git branch
 */
export function isGitBranch(value: unknown): value is GitBranch {
  if (!isObject(value)) return false;

  return (
    isString(value.name) &&
    isBoolean(value.current) &&
    (value.remote === undefined || isBoolean(value.remote)) &&
    (value.tracking === undefined || isString(value.tracking))
  );
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("timeout") ||
      message.includes("fetch") ||
      error.name === "NetworkError" ||
      error.name === "TypeError"
    );
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("unauthorized") ||
      message.includes("authentication") ||
      message.includes("api key") ||
      message.includes("forbidden")
    );
  }

  if (isObject(error) && isNumber(error.status)) {
    return error.status === 401 || error.status === 403;
  }

  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("required") ||
      message.includes("format")
    );
  }

  if (isObject(error) && isNumber(error.status)) {
    return error.status === 400 || error.status === 422;
  }

  return false;
}

/**
 * Check if value has a specific property with expected type
 */
export function hasProperty<T, K extends string>(
  obj: T,
  prop: K,
  typeCheck: (value: unknown) => boolean,
): obj is T & Record<K, unknown> {
  return typeof obj === "object" && obj !== null && prop in obj && typeCheck((obj as Record<K, unknown>)[prop]);
}

/**
 * Type guard for non-null/undefined values
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for non-empty strings
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

/**
 * Type guard for positive numbers
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * Type guard for integers
 */
export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * Type guard for valid URLs
 */
export function isValidUrl(value: unknown): value is string {
  if (!isString(value)) return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for valid email addresses
 */
export function isValidEmail(value: unknown): value is string {
  if (!isString(value)) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Create a type guard for arrays of specific types
 */
export function isArrayOf<T>(typeGuard: (item: unknown) => item is T): (value: unknown) => value is T[] {
  return (value: unknown): value is T[] => {
    return isArray(value) && value.every(typeGuard);
  };
}

/**
 * Create a type guard for optional properties
 */
export function isOptional<T>(typeGuard: (value: unknown) => value is T): (value: unknown) => value is T | undefined {
  return (value: unknown): value is T | undefined => {
    return value === undefined || typeGuard(value);
  };
}
