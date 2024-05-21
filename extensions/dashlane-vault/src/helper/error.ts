import { Toast, open, openExtensionPreferences } from "@raycast/api";

export class DisplayableError extends Error {
  action?: Toast.ActionOptions;

  constructor(message: string, stack?: string) {
    super(message);
    this.stack = stack;
  }
}

export class CLINotFoundError extends DisplayableError {
  name = "CLINotFoundError";
  action: Toast.ActionOptions = {
    title: "Open Preferences",
    shortcut: { modifiers: ["opt", "cmd"], key: "." },
    onAction: () => openExtensionPreferences(),
  };

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

export class ParseError extends DisplayableError {
  name = "ParseError";

  constructor(message?: string, stack?: string) {
    super(message ?? "Could not parse CLI data", stack);
  }
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
