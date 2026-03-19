/**
 * Custom error types for AWS operations in the Raycast extension
 */

/**
 * Error thrown when an AWS API call fails
 */
export class AWSClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly service: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AWSClientError";
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Error thrown when a required resource is not found
 */
export class ResourceNotFoundError extends Error {
  constructor(
    message: string,
    public readonly resourceType: string,
    public readonly resourceId: string,
  ) {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}

/**
 * Extracts a user-friendly error message from AWS SDK errors
 * @param error - The error to extract a message from
 * @returns A user-friendly error message
 */
export function getAWSErrorMessage(error: unknown): string {
  if (error instanceof AWSClientError) {
    return `${error.service}: ${error.message} (${error.code})`;
  }

  if (error instanceof ValidationError) {
    return `Validation failed for ${error.field}: ${error.message}`;
  }

  if (error instanceof ResourceNotFoundError) {
    return `${error.resourceType} not found: ${error.resourceId}`;
  }

  if (error instanceof Error) {
    // Try to parse AWS SDK error structure
    const awsError = error as Error & { code?: string; $metadata?: { httpStatusCode?: number } };
    if (awsError.code) {
      return `${awsError.code}: ${error.message}`;
    }
    return error.message;
  }

  return String(error);
}

/**
 * Creates an AWSClientError from an unknown error
 * @param error - The original error
 * @param service - The AWS service that threw the error
 * @returns An AWSClientError instance
 */
export function toAWSClientError(error: unknown, service: string): AWSClientError {
  if (error instanceof AWSClientError) {
    return error;
  }

  if (error instanceof Error) {
    const awsError = error as Error & { code?: string; $metadata?: { httpStatusCode?: number } };
    return new AWSClientError(error.message, awsError.code ?? "UnknownError", service, {
      originalError: error.name,
      httpStatusCode: awsError.$metadata?.httpStatusCode,
    });
  }

  return new AWSClientError(String(error), "UnknownError", service);
}
