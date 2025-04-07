export class ManuallyThrownError extends Error {
  constructor(message: string, stack?: string) {
    super(message);
    this.stack = stack;
  }
}

export class DisplayableError extends ManuallyThrownError {
  constructor(message: string, stack?: string) {
    super(message, stack);
  }
}

/* -- specific errors below -- */

export class CLINotFoundError extends DisplayableError {
  constructor(message: string, stack?: string) {
    super(message ?? "Bitwarden CLI not found", stack);
    this.name = "CLINotFoundError";
    this.stack = stack;
  }
}

export class InstalledCLINotFoundError extends DisplayableError {
  constructor(message: string, stack?: string) {
    super(message ?? "Bitwarden CLI not found", stack);
    this.name = "InstalledCLINotFoundError";
    this.stack = stack;
  }
}

export class FailedToLoadVaultItemsError extends ManuallyThrownError {
  constructor(message?: string, stack?: string) {
    super(message ?? "Failed to load vault items", stack);
    this.name = "FailedToLoadVaultItemsError";
  }
}

export class VaultIsLockedError extends DisplayableError {
  constructor(message?: string, stack?: string) {
    super(message ?? "Vault is locked", stack);
    this.name = "VaultIsLockedError";
  }
}

export class NotLoggedInError extends ManuallyThrownError {
  constructor(message: string, stack?: string) {
    super(message ?? "Not logged in", stack);
    this.name = "NotLoggedInError";
  }
}

export class EnsureCliBinError extends DisplayableError {
  constructor(message?: string, stack?: string) {
    super(message ?? "Failed do download Bitwarden CLI", stack);
    this.name = "EnsureCliBinError";
  }
}

export class PremiumFeatureError extends ManuallyThrownError {
  constructor(message?: string, stack?: string) {
    super(message ?? "Premium status is required to use this feature", stack);
    this.name = "PremiumFeatureError";
  }
}
export class SendNeedsPasswordError extends ManuallyThrownError {
  constructor(message?: string, stack?: string) {
    super(message ?? "This Send has a is protected by a password", stack);
    this.name = "SendNeedsPasswordError";
  }
}

export class SendInvalidPasswordError extends ManuallyThrownError {
  constructor(message?: string, stack?: string) {
    super(message ?? "The password you entered is invalid", stack);
    this.name = "SendInvalidPasswordError";
  }
}

/* -- error utils below -- */

export function tryExec<T>(fn: () => T): T extends void ? T : T | undefined;
export function tryExec<T, F>(fn: () => T, fallbackValue: F): T | F;
export function tryExec<T, F>(fn: () => T, fallbackValue?: F): T | F | undefined {
  try {
    return fn();
  } catch {
    return fallbackValue;
  }
}

export function getDisplayableErrorMessage(error: any) {
  if (error instanceof DisplayableError) return error.message;
  return undefined;
}

export const getErrorString = (error: any): string | undefined => {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const { message, name } = error;
    if (error.stack) return error.stack;
    return `${name}: ${message}`;
  }
  return String(error);
};

export type Success<T> = { data: T; error: null };
export type Failure<E> = { data: null; error: E };
export type Result<T, E = Error> = Success<T> | Failure<E>;

export function Ok<T>(data: T) {
  return { data, error: null } as { data: T; error: null };
}
export function Err<E = Error>(error: E) {
  return { data: null, error } as { data: null; error: E };
}

/** Same as {@link Success} but with a named data property */
export type SuccessN<N extends string, T> = { [k in N]: T } & { error: null };
/** Same as {@link Failure} but with a named error property */
export type FailureN<N extends string, E> = { [K in N]: null } & { error: E };
/** Same as {@link Result} but with a named data property */
export type ResultN<N extends string, T, E = Error> = SuccessN<N, T> | FailureN<N, E>;

/** Same as {@link Ok} but with a named data property */
export function OkN<N extends string, T>(as: N, data: T) {
  return { [as]: data, error: null } as ResultN<N, T>;
}
/** Same as {@link Err} but with a named error property */
export function ErrN<N extends string, E = Error>(as: N, error: E) {
  return { [as]: null, error } as { [k in N]: null } & { error: E };
}

export function tryCatch<T, E = Error>(fn: () => T): Result<T, E>;
export function tryCatch<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>>;
/**
 * Execute a function or a promise safely inside a try/catch and
 * return a `Result` (`data` and `error`).
 */
export function tryCatch<T, E = Error>(fnOrPromise: (() => T) | Promise<T>): MaybePromise<Result<T, E>> {
  if (typeof fnOrPromise === "function") {
    try {
      const data = fnOrPromise();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as E };
    }
  }
  return fnOrPromise.then((data) => ({ data, error: null })).catch((error) => ({ data: null, error }));
}
