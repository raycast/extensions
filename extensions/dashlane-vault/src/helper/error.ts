import { Toast, captureException as captureExceptionInternal, open, openExtensionPreferences } from "@raycast/api";

export const OpenPreferencesAction: Toast.ActionOptions = {
  title: "Open Preferences",
  shortcut: { modifiers: ["opt", "cmd"], key: "." },
  onAction: () => openExtensionPreferences(),
};

export class DisplayableError extends Error {
  action?: Toast.ActionOptions;

  constructor(message: string, stack?: string) {
    super(message);
    this.stack = stack;
  }
}

export class CLINotFoundError extends DisplayableError {
  name = "CLINotFoundError";
  action = OpenPreferencesAction;

  constructor(message?: string, stack?: string) {
    super(message ?? "Dashlane CLI not found", stack);
  }
}

export class CLIVersionNotSupportedError extends DisplayableError {
  name = "CLIVersionNotSupportedError";
  action: Toast.ActionOptions = {
    title: "Update Version",
    shortcut: { modifiers: ["cmd"], key: "u" },
    onAction: () => open("https://dashlane.github.io/dashlane-cli/install"),
  };

  constructor(message?: string, stack?: string) {
    super(message ?? "Dashlane CLI version not supported", stack);
  }
}

export class CLINotLoggedInError extends DisplayableError {
  name = "CLINotLoggedInError";
  action: Toast.ActionOptions = {
    title: "Show documentation",
    shortcut: { modifiers: ["cmd"], key: "u" },
    onAction: () => open("https://dashlane.github.io/dashlane-cli/personal/authentication"),
  };

  constructor(stack?: string) {
    super("Not logged in to Dashlane CLI", stack);
  }
}

export class ParseError extends DisplayableError {
  name = "ParseError";

  constructor(message?: string, stack?: string) {
    super(message ?? "Could not parse CLI data", stack);
  }
}

export class MasterPasswordMissingError extends DisplayableError {
  name = "MasterPasswordMissingError";
  action = OpenPreferencesAction;

  constructor(stack?: string) {
    super("Master password is missing in preferences", stack);
  }
}

export class TimeoutError extends DisplayableError {
  name = "TimeoutError";

  constructor(stack: string) {
    super("Timeout", stack);
  }
}

/**
 * These errors are shown buz should not be send to raycast
 */
const uncapturedErrors = [
  CLIVersionNotSupportedError,
  CLINotLoggedInError,
  MasterPasswordMissingError,
  TimeoutError,
  CLINotFoundError,
];

/**
 * Captures unexpected errors to raycast
 */
export function captureException(error: unknown) {
  if (uncapturedErrors.some((errorClass) => error instanceof errorClass)) return;
  captureExceptionInternal(error);
}

export function getErrorAction(error: unknown) {
  if (error instanceof DisplayableError) return error.action;
}

export function getDisplayableErrorMessage(error: unknown) {
  if (error instanceof DisplayableError) return error.message;
  return undefined;
}

export const getErrorString = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    if (error.stack) return error.stack;
    const { message, name } = error;
    return `${name}: ${message}`;
  }
  return String(error);
};
