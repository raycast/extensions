type ErrorLike = Record<string, unknown>;

const getString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
};

const safeJsonStringify = (value: unknown): string | null => {
  try {
    if (value && typeof value === "object") {
      const keys = Object.getOwnPropertyNames(value);
      return JSON.stringify(value, keys);
    }
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message || "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "number" ||
    typeof error === "boolean" ||
    typeof error === "bigint" ||
    typeof error === "symbol"
  ) {
    return String(error);
  }

  if (error && typeof error === "object") {
    const err = error as ErrorLike;
    const candidates = [err.message, err.error, err.detail, err.details, err.description, err.statusText];
    for (const candidate of candidates) {
      const message = getString(candidate);
      if (message) return message;
    }

    if (typeof err.status === "number") {
      const statusText = getString(err.statusText);
      return statusText ? `HTTP ${err.status}: ${statusText}` : `HTTP ${err.status}`;
    }

    const json = safeJsonStringify(error);
    if (json && json !== "{}") return json;

    const tag = Object.prototype.toString.call(error);
    if (tag && tag !== "[object Object]") return tag;
  }

  return "Unknown error";
};

export const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; code?: string; message?: string };
  if (err.name === "AbortError" || err.code === "ABORT_ERR") return true;
  const message = typeof err.message === "string" ? err.message.toLowerCase() : "";
  return message.includes("aborted") || message.includes("abort");
};

export const toError = (error: unknown, fallbackMessage = "Unknown error"): Error => {
  if (error instanceof Error) return error;
  const message = toErrorMessage(error);
  return new Error(message || fallbackMessage);
};
