export const ERROR_TYPES = {
  CLINotFound: "CLINotFound",
  FailedToLoadVaultItemsError: "FailedToLoadVaultItemsError",
} as const;

export class CLINotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = ERROR_TYPES.CLINotFound;
  }
}

export class FailedToLoadVaultItemsError extends Error {
  constructor(message?: string) {
    super(message ?? "Failed to load vault items");
    this.name = ERROR_TYPES.CLINotFound;
  }
}
