export class RaylogStorageError extends Error {}
export class RaylogConfigurationError extends RaylogStorageError {}
export class RaylogInitializationRequiredError extends RaylogStorageError {}

export class RaylogParseError extends RaylogStorageError {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(formatStorageErrorMessage(message, detail));
    this.name = "RaylogParseError";
  }
}

export class RaylogTaskNotFoundError extends RaylogStorageError {}
export class RaylogWorkLogNotFoundError extends RaylogStorageError {}

export class RaylogSchemaError extends RaylogStorageError {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(formatStorageErrorMessage(message, detail));
    this.name = "RaylogSchemaError";
  }
}

export function isRaylogCorruptionError(
  error: unknown,
): error is RaylogParseError | RaylogSchemaError {
  return (
    error instanceof RaylogParseError || error instanceof RaylogSchemaError
  );
}

export function getRaylogErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error ? error.message : fallback;
}

function formatStorageErrorMessage(message: string, detail?: string): string {
  return detail ? `${message} ${detail}` : message;
}
