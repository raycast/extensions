export interface ParsedApiError {
  code?: string;
  message: string;
}

interface ApiFailureDiagnosticsInput {
  code?: string;
  hasApiKey: boolean;
  message: string;
  method: string;
  responseBody: string;
  status: number;
  token?: string;
  url: string;
}

interface ApiFailureDiagnostics {
  code?: string;
  hasApiKey: boolean;
  message: string;
  method: string;
  responseBody?: string;
  status: number;
  url: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

const redactToken = (value: string, token?: string) =>
  token && value.includes(token) ? value.replaceAll(token, "[REDACTED]") : value;

export const buildApiFailureDiagnostics = (input: ApiFailureDiagnosticsInput): ApiFailureDiagnostics => {
  const responseBody = redactToken(input.responseBody.trim(), input.token);

  return {
    ...(input.code ? { code: input.code } : {}),
    hasApiKey: input.hasApiKey,
    message: redactToken(input.message, input.token),
    method: input.method,
    ...(responseBody ? { responseBody } : {}),
    status: input.status,
    url: input.url,
  };
};

export const parseApiErrorPayload = (payload: string, fallbackMessage: string): ParsedApiError => {
  const trimmed = payload.trim();
  if (!trimmed) {
    return { message: fallbackMessage };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (isRecord(parsed)) {
      const code = readString(parsed.code) ?? readString(parsed.error);
      const message =
        readString(parsed.message) ??
        readString(parsed.error_description) ??
        readString(parsed.error) ??
        fallbackMessage;
      return { ...(code ? { code } : {}), message };
    }
  } catch {
    return { message: trimmed };
  }

  return { message: trimmed };
};

export const getErrorMessage = (error: unknown, fallbackMessage = "Something went wrong.") =>
  error instanceof Error ? error.message : fallbackMessage;
