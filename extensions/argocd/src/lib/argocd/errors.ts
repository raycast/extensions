/**
 * One error type per recoverable UI state. The client maps HTTP status codes here so that
 * nothing above it has to know about status codes, and so an exhaustive switch in the UI stays
 * honest when a new failure mode is added.
 *
 * No error message ever carries a token, a full URL with its query string, or a raw response
 * body: these strings end up in toasts and in Raycast's log.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string) {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Raised before any request is built when the instance is not marked writable. It is a bug if
 * a user ever sees this: the UI hides write actions on those instances. The check exists
 * anyway, because a UI regression must not be able to produce a write against production.
 */
export class ReadOnlyInstanceError extends Error {
  constructor(readonly instanceName: string) {
    super(`${instanceName} is configured read-only, so this action was refused.`);
    this.name = "ReadOnlyInstanceError";
  }
}

/** The reachability probe could not reach the server at all, usually a VPN that is down. */
export class UnreachableError extends Error {
  constructor(
    readonly instanceName: string,
    reason?: string,
  ) {
    super(`${instanceName} is unreachable${reason ? `: ${reason}` : ""}. Check your VPN connection.`);
    this.name = "UnreachableError";
  }
}
