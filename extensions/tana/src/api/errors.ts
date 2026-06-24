export type TanaErrorKind = "not-running" | "auth" | "tool" | "protocol" | "timeout";

export type TanaClientError = Error & {
  kind: TanaErrorKind;
  status?: number;
};

const safeMessage = (message: string, secrets: string[]) =>
  secrets
    .reduce((result, secret) => (secret ? result.replaceAll(secret, "[REDACTED]") : result), message)
    .slice(0, 500);

export const createTanaError = (
  kind: TanaErrorKind,
  message: string,
  options: { cause?: unknown; status?: number; secrets?: string[] } = {},
): TanaClientError => {
  const error = new Error(safeMessage(message, options.secrets ?? [])) as TanaClientError & { cause?: unknown };
  error.cause = options.cause;
  error.name = "TanaClientError";
  error.kind = kind;
  error.status = options.status;
  return error;
};

export const isTanaClientError = (error: unknown): error is TanaClientError =>
  error instanceof Error && "kind" in error;
