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

/* -- error utils below -- */

export class EnsureCliBinError extends DisplayableError {
  constructor(message?: string, stack?: string) {
    super(message ?? "Failed do download Bitwarden CLI", stack);
    this.name = "EnsureCliBinError";
  }
}

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
