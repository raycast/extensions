import { showToast, Toast } from "@raycast/api";
import { ErrorTypes } from "../types";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error occurred";
}

export function isOpenAIError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes("API key") ||
      error.message.includes("OpenAI") ||
      error.message.includes("quota")
    );
  }
  return false;
}

export async function showErrorToast(
  title: string,
  error: unknown,
): Promise<void> {
  const message = getErrorMessage(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
}

export function createErrorMessage(type: ErrorTypes, details?: string): string {
  return details ? `${type}: ${details}` : type;
}
