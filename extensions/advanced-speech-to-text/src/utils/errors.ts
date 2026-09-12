import { showFailureToast } from "@raycast/utils";
import { ErrorTypes } from "../types";
import { APIError } from "openai";

export class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

export class APIKeyError extends OpenAIError {
  constructor(message: string = "Invalid or missing API key") {
    super(message, "invalid_api_key");
    this.name = "APIKeyError";
  }
}

export class QuotaError extends OpenAIError {
  constructor(message: string = "API quota exceeded") {
    super(message, "quota_exceeded");
    this.name = "QuotaError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error occurred";
}

export function isOpenAIError(error: unknown): error is OpenAIError | APIError {
  if (error instanceof OpenAIError || error instanceof APIError) {
    return true;
  }
  if (error instanceof Error) {
    return error.name === "OpenAIError" || error.name === "APIError";
  }
  return false;
}

export async function showErrorToast(
  title: string,
  error: unknown,
): Promise<void> {
  const message = getErrorMessage(error);
  await showFailureToast({ title, message });
}

export function createErrorMessage(type: ErrorTypes, details?: string): string {
  return details ? `${type}: ${details}` : type;
}

export function handleOpenAIError(error: unknown): never {
  if (error instanceof APIError) {
    if (error.status === 401) {
      throw new APIKeyError();
    }
    if (error.status === 429) {
      throw new QuotaError();
    }
    throw new OpenAIError(error.message, error.code ?? undefined);
  }

  if (error instanceof Error) {
    if (error.message.includes("API key")) {
      throw new APIKeyError();
    }
    if (error.message.includes("quota")) {
      throw new QuotaError();
    }
  }

  throw new OpenAIError(getErrorMessage(error));
}
