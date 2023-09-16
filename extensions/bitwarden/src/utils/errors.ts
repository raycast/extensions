export class ManuallyThrownError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class DisplayableError extends ManuallyThrownError {
  constructor(message: string) {
    super(message);
  }
}

export class CLINotFoundError extends DisplayableError {
  constructor(message: string) {
    super(message ?? "Bitwarden CLI not found");
    this.name = "CLINotFoundError";
  }
}

export class FailedToLoadVaultItemsError extends ManuallyThrownError {
  constructor(message?: string) {
    super(message ?? "Failed to load vault items");
    this.name = "FailedToLoadVaultItemsError";
  }
}

export class VaultIsLockedError extends DisplayableError {
  constructor(message?: string) {
    super(message ?? "Vault is locked");
    this.name = "VaultIsLockedError";
  }
}

export function getDisplayableErrorMessage(error: any) {
  if (error instanceof DisplayableError) return error.message;
  return undefined;
}
