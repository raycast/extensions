import { STATUS_CODES } from "node:http";
import { ZodError } from "zod";

export type UsageLimitsErrorKind = "fetch" | "parse";

type UsageLimitsErrorInput = {
  kind: UsageLimitsErrorKind;
  error: unknown;
  status?: number;
  statusText?: string;
  responseText?: string;
};

type NormalizedUsageLimitsError = {
  title: string;
  message: string;
  log: string;
  status?: number;
  statusText?: string;
};

const stringifyUnknown = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const formatFetchErrorLog = (status: number, statusText: string, responseText?: string): string => {
  const parts = [`HTTP ${status} ${statusText}`];

  if (responseText?.trim()) {
    parts.push("", responseText);
  }

  return parts.join("\n");
};

export class UsageLimitsError extends Error {
  readonly kind: UsageLimitsErrorKind;
  readonly title: string;
  readonly log: string;
  readonly status?: number;
  readonly statusText?: string;

  constructor({ kind, error, status, statusText, responseText }: UsageLimitsErrorInput) {
    let normalized: NormalizedUsageLimitsError;

    if (kind === "parse") {
      if (error instanceof SyntaxError) {
        normalized = {
          title: "Failed to Parse Usage Limits",
          message: "Claude API returned invalid JSON for usage limits.",
          log: [`JSON parse error: ${error.message}`, "", responseText ?? ""].filter(Boolean).join("\n"),
        };
      } else if (error instanceof ZodError) {
        normalized = {
          title: "Failed to Parse Usage Limits",
          message: "Claude API returned usage limits in an unexpected format.",
          log: [`Validation error: ${error.message}`, "", responseText ?? ""].filter(Boolean).join("\n"),
        };
      } else {
        normalized = {
          title: "Failed to Parse Usage Limits",
          message: error instanceof Error ? error.message : "Unknown error occurred while parsing usage limits.",
          log: [stringifyUnknown(error), "", responseText ?? ""].filter(Boolean).join("\n"),
        };
      }
    } else if (typeof status === "number") {
      const resolvedStatusText = statusText || STATUS_CODES[status] || "Request Failed";

      normalized = {
        title: "Failed to Fetch Usage Limits",
        message: error instanceof Error ? error.message : "Unknown error occurred while fetching usage limits.",
        log: formatFetchErrorLog(status, resolvedStatusText, responseText),
        status,
        statusText: resolvedStatusText,
      };
    } else {
      normalized = {
        title: "Failed to Fetch Usage Limits",
        message: error instanceof Error ? error.message : "Unknown error occurred while fetching usage limits.",
        log: stringifyUnknown(error),
      };
    }

    super(normalized.message, error instanceof Error ? { cause: error } : undefined);
    this.name = "UsageLimitsError";
    this.kind = kind;
    this.title = normalized.title;
    this.log = normalized.log;
    this.status = normalized.status;
    this.statusText = normalized.statusText;
  }
}

export const sanitizeCodeBlock = (value: string): string => value.replace(/```/g, "\\`\\`\\`");
