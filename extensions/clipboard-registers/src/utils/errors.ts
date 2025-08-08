/**
 * Custom error classes for better error categorization and handling
 */

/**
 * Base error class for register-related operations
 */
export class RegisterError extends Error {
  constructor(
    message: string,
    public readonly registerId?: number,
    public readonly operation?: string,
  ) {
    super(message);
    this.name = "RegisterError";
  }
}

/**
 * Error for file system operations
 */
export class FileOperationError extends RegisterError {
  constructor(
    message: string,
    public readonly filePath: string,
    registerId?: number,
  ) {
    super(message, registerId, "file_operation");
    this.name = "FileOperationError";
  }
}

/**
 * Error for invalid state or corrupted data
 */
export class StateError extends RegisterError {
  constructor(message: string, registerId?: number) {
    super(message, registerId, "state");
    this.name = "StateError";
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends RegisterError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
  ) {
    super(message, undefined, "validation");
    this.name = "ValidationError";
  }
}

/**
 * Error for clipboard operations
 */
export class ClipboardError extends RegisterError {
  constructor(message: string, registerId?: number) {
    super(message, registerId, "clipboard");
    this.name = "ClipboardError";
  }
}
