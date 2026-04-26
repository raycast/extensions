import { APICallError, RetryError } from "ai";

export function formatError(err: unknown): string {
  if (RetryError.isInstance(err)) return formatError(err.lastError);

  if (
    err instanceof TypeError &&
    /fetch|network|ENOTFOUND|ECONNREFUSED/i.test(err.message)
  ) {
    return "Network error — check your internet connection and try again.";
  }

  if (APICallError.isInstance(err)) {
    const { statusCode, message } = err;

    if (statusCode === 401)
      return "Invalid API key — open preferences and check your key.";
    if (statusCode === 403)
      return "Access denied — your API key may not have access to this model.";
    if (statusCode === 404) {
      const model = message.match(/model[: ]+([^\s,]+)/i)?.[1] ?? "unknown";
      return `Model not found — "${model}" doesn't exist for this provider. Check your model ID in preferences.`;
    }
    if (statusCode === 429) {
      return /quota|billing|exceeded/i.test(message)
        ? "API quota exceeded — check your plan and billing details."
        : "Rate limit reached — wait a moment and try again.";
    }
    if (statusCode === 400) {
      return /too long|context.{0,20}window|max.{0,10}token|input.{0,10}length/i.test(
        message,
      )
        ? "Text is too long for this model's context window. Try with shorter text."
        : `Bad request: ${message}`;
    }
    if (statusCode !== undefined && statusCode >= 500) {
      return `Provider server error (${statusCode}) — not your fault. Try again in a moment.`;
    }
    return message;
  }

  return err instanceof Error ? err.message : String(err);
}
