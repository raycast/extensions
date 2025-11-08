// Error handling utilities and custom error types

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ClipboardError extends AppError {
  constructor(message: string) {
    super(message, "CLIPBOARD_ERROR");
  }
}

export class ProviderError extends AppError {
  constructor(
    message: string,
    public provider?: string,
  ) {
    super(message, "PROVIDER_ERROR");
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message, "NETWORK_ERROR");
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message, "VALIDATION_ERROR");
  }
}

export class StorageError extends AppError {
  constructor(message: string) {
    super(message, "STORAGE_ERROR");
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}
