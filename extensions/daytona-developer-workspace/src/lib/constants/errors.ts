/**
 * Error-related constants
 */

export const ERROR_CODES = {
  // API Errors
  API_UNAUTHORIZED: "API_UNAUTHORIZED",
  API_FORBIDDEN: "API_FORBIDDEN",
  API_NOT_FOUND: "API_NOT_FOUND",
  API_RATE_LIMITED: "API_RATE_LIMITED",
  API_SERVER_ERROR: "API_SERVER_ERROR",
  API_TIMEOUT: "API_TIMEOUT",
  API_NETWORK_ERROR: "API_NETWORK_ERROR",

  // Sandbox Errors
  SANDBOX_NOT_FOUND: "SANDBOX_NOT_FOUND",
  SANDBOX_ALREADY_RUNNING: "SANDBOX_ALREADY_RUNNING",
  SANDBOX_ALREADY_STOPPED: "SANDBOX_ALREADY_STOPPED",
  SANDBOX_CREATION_FAILED: "SANDBOX_CREATION_FAILED",
  SANDBOX_START_FAILED: "SANDBOX_START_FAILED",
  SANDBOX_STOP_FAILED: "SANDBOX_STOP_FAILED",
  SANDBOX_DELETE_FAILED: "SANDBOX_DELETE_FAILED",

  // Execution Errors
  EXECUTION_TIMEOUT: "EXECUTION_TIMEOUT",
  EXECUTION_FAILED: "EXECUTION_FAILED",
  EXECUTION_CANCELLED: "EXECUTION_CANCELLED",
  EXECUTION_MEMORY_LIMIT: "EXECUTION_MEMORY_LIMIT",
  EXECUTION_DISK_LIMIT: "EXECUTION_DISK_LIMIT",

  // Git Errors
  GIT_NOT_REPOSITORY: "GIT_NOT_REPOSITORY",
  GIT_COMMIT_FAILED: "GIT_COMMIT_FAILED",
  GIT_PUSH_FAILED: "GIT_PUSH_FAILED",
  GIT_PULL_FAILED: "GIT_PULL_FAILED",
  GIT_MERGE_CONFLICT: "GIT_MERGE_CONFLICT",
  GIT_AUTHENTICATION_FAILED: "GIT_AUTHENTICATION_FAILED",

  // File System Errors
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  FILE_PERMISSION_DENIED: "FILE_PERMISSION_DENIED",
  FILE_READ_FAILED: "FILE_READ_FAILED",
  FILE_WRITE_FAILED: "FILE_WRITE_FAILED",
  FILE_DELETE_FAILED: "FILE_DELETE_FAILED",
  DIRECTORY_NOT_EMPTY: "DIRECTORY_NOT_EMPTY",

  // Validation Errors
  VALIDATION_REQUIRED: "VALIDATION_REQUIRED",
  VALIDATION_INVALID_FORMAT: "VALIDATION_INVALID_FORMAT",
  VALIDATION_TOO_SHORT: "VALIDATION_TOO_SHORT",
  VALIDATION_TOO_LONG: "VALIDATION_TOO_LONG",
  VALIDATION_INVALID_URL: "VALIDATION_INVALID_URL",
  VALIDATION_INVALID_EMAIL: "VALIDATION_INVALID_EMAIL",

  // Cache Errors
  CACHE_WRITE_FAILED: "CACHE_WRITE_FAILED",
  CACHE_READ_FAILED: "CACHE_READ_FAILED",
  CACHE_QUOTA_EXCEEDED: "CACHE_QUOTA_EXCEEDED",
  CACHE_CORRUPTED: "CACHE_CORRUPTED",

  // Configuration Errors
  CONFIG_INVALID: "CONFIG_INVALID",
  CONFIG_MISSING_API_KEY: "CONFIG_MISSING_API_KEY",
  CONFIG_INVALID_API_KEY: "CONFIG_INVALID_API_KEY",
  CONFIG_MISSING_URL: "CONFIG_MISSING_URL",
  CONFIG_INVALID_URL: "CONFIG_INVALID_URL",
} as const;

export const ERROR_MESSAGES = {
  [ERROR_CODES.API_UNAUTHORIZED]: "Invalid API key or unauthorized access",
  [ERROR_CODES.API_FORBIDDEN]: "Access forbidden - insufficient permissions",
  [ERROR_CODES.API_NOT_FOUND]: "Resource not found",
  [ERROR_CODES.API_RATE_LIMITED]: "Rate limit exceeded - please try again later",
  [ERROR_CODES.API_SERVER_ERROR]: "Server error - please try again",
  [ERROR_CODES.API_TIMEOUT]: "Request timed out - please try again",
  [ERROR_CODES.API_NETWORK_ERROR]: "Network error - check your connection",

  [ERROR_CODES.SANDBOX_NOT_FOUND]: "Sandbox not found",
  [ERROR_CODES.SANDBOX_ALREADY_RUNNING]: "Sandbox is already running",
  [ERROR_CODES.SANDBOX_ALREADY_STOPPED]: "Sandbox is already stopped",
  [ERROR_CODES.SANDBOX_CREATION_FAILED]: "Failed to create sandbox",
  [ERROR_CODES.SANDBOX_START_FAILED]: "Failed to start sandbox",
  [ERROR_CODES.SANDBOX_STOP_FAILED]: "Failed to stop sandbox",
  [ERROR_CODES.SANDBOX_DELETE_FAILED]: "Failed to delete sandbox",

  [ERROR_CODES.EXECUTION_TIMEOUT]: "Code execution timed out",
  [ERROR_CODES.EXECUTION_FAILED]: "Code execution failed",
  [ERROR_CODES.EXECUTION_CANCELLED]: "Code execution was cancelled",
  [ERROR_CODES.EXECUTION_MEMORY_LIMIT]: "Memory limit exceeded",
  [ERROR_CODES.EXECUTION_DISK_LIMIT]: "Disk limit exceeded",

  [ERROR_CODES.GIT_NOT_REPOSITORY]: "Not a git repository",
  [ERROR_CODES.GIT_COMMIT_FAILED]: "Failed to commit changes",
  [ERROR_CODES.GIT_PUSH_FAILED]: "Failed to push changes",
  [ERROR_CODES.GIT_PULL_FAILED]: "Failed to pull changes",
  [ERROR_CODES.GIT_MERGE_CONFLICT]: "Merge conflict detected",
  [ERROR_CODES.GIT_AUTHENTICATION_FAILED]: "Git authentication failed",

  [ERROR_CODES.FILE_NOT_FOUND]: "File or directory not found",
  [ERROR_CODES.FILE_PERMISSION_DENIED]: "Permission denied",
  [ERROR_CODES.FILE_READ_FAILED]: "Failed to read file",
  [ERROR_CODES.FILE_WRITE_FAILED]: "Failed to write file",
  [ERROR_CODES.FILE_DELETE_FAILED]: "Failed to delete file",
  [ERROR_CODES.DIRECTORY_NOT_EMPTY]: "Directory is not empty",

  [ERROR_CODES.VALIDATION_REQUIRED]: "This field is required",
  [ERROR_CODES.VALIDATION_INVALID_FORMAT]: "Invalid format",
  [ERROR_CODES.VALIDATION_TOO_SHORT]: "Value is too short",
  [ERROR_CODES.VALIDATION_TOO_LONG]: "Value is too long",
  [ERROR_CODES.VALIDATION_INVALID_URL]: "Invalid URL format",
  [ERROR_CODES.VALIDATION_INVALID_EMAIL]: "Invalid email format",

  [ERROR_CODES.CACHE_WRITE_FAILED]: "Failed to write to cache",
  [ERROR_CODES.CACHE_READ_FAILED]: "Failed to read from cache",
  [ERROR_CODES.CACHE_QUOTA_EXCEEDED]: "Cache storage quota exceeded",
  [ERROR_CODES.CACHE_CORRUPTED]: "Cache data is corrupted",

  [ERROR_CODES.CONFIG_INVALID]: "Invalid configuration",
  [ERROR_CODES.CONFIG_MISSING_API_KEY]: "API key is required",
  [ERROR_CODES.CONFIG_INVALID_API_KEY]: "Invalid API key format",
  [ERROR_CODES.CONFIG_MISSING_URL]: "Daytona URL is required",
  [ERROR_CODES.CONFIG_INVALID_URL]: "Invalid Daytona URL format",
} as const;

export const ERROR_RECOVERY_SUGGESTIONS = {
  [ERROR_CODES.API_UNAUTHORIZED]: [
    "Check your API key in settings",
    "Verify your Daytona account has the necessary permissions",
    "Ensure the API key has not expired",
  ],
  [ERROR_CODES.API_NETWORK_ERROR]: [
    "Check your internet connection",
    "Verify the Daytona URL is correct",
    "Try again in a few moments",
  ],
  [ERROR_CODES.SANDBOX_CREATION_FAILED]: [
    "Check the repository URL is valid and accessible",
    "Ensure you have sufficient resources",
    "Try creating with a different name",
  ],
  [ERROR_CODES.GIT_MERGE_CONFLICT]: [
    "Resolve conflicts manually in the files",
    "Use git status to see conflicted files",
    "Commit after resolving all conflicts",
  ],
  [ERROR_CODES.EXECUTION_TIMEOUT]: [
    "Optimize your code for better performance",
    "Increase the timeout limit in settings",
    "Break down complex operations into smaller steps",
  ],
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
export type ErrorMessage = (typeof ERROR_MESSAGES)[ErrorCode];
export type RecoverySuggestion = (typeof ERROR_RECOVERY_SUGGESTIONS)[keyof typeof ERROR_RECOVERY_SUGGESTIONS];
