import { showHUD } from "@raycast/api";

export const TIMEOUT = 5000;

export type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    return new Error(String(maybeError));
  }
}

export async function showErrorHUD(action: string, error: unknown) {
  const errorWithMessage = toErrorWithMessage(error);
  console.error(`Error ${action}:`, errorWithMessage.message);
  await showHUD(`Error ${action}: ${errorWithMessage.message}`);
}

export function validateInput(input: string): string {
  return input.replace(/["\\]/g, "").trim();
}
