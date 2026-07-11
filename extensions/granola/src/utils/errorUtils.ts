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

const LOG_PREFIX = "[Granola]";

export type GranolaLogContext = Record<string, unknown>;

function getErrorDetails(error: unknown): GranolaLogContext {
  const details: GranolaLogContext = { message: toErrorMessage(error) };

  if (error instanceof Error) {
    if (error.name) details.name = error.name;
    if (error.stack) details.stack = error.stack;

    const err = error as Error & { status?: number; statusText?: string; cause?: unknown };
    if (typeof err.status === "number") details.status = err.status;
    if (err.statusText) details.statusText = err.statusText;
    if (err.cause !== undefined) details.cause = toErrorMessage(err.cause);
  } else if (error && typeof error === "object") {
    const err = error as ErrorLike;
    if (typeof err.status === "number") details.status = err.status;
    if (err.statusText) details.statusText = err.statusText;
  }

  return details;
}

/** Logs structured errors to the Raycast dev console (visible in `npm run dev`). */
export function logGranolaError(context: string, error: unknown, extra?: GranolaLogContext): void {
  console.error(`${LOG_PREFIX} ${context}`, {
    ...getErrorDetails(error),
    ...extra,
  });
}

export function logGranolaWarn(context: string, extra?: GranolaLogContext): void {
  console.warn(`${LOG_PREFIX} ${context}`, extra ?? {});
}

export function logGranolaInfo(context: string, extra?: GranolaLogContext): void {
  console.log(`${LOG_PREFIX} ${context}`, extra ?? {});
}
