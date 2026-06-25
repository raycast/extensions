export function throwApiError(action: string, error: unknown, response?: Response): never {
  const status = response ? `${response.status} ${response.statusText}`.trim() : undefined;
  const message = getErrorMessage(error);
  const details = [status, message].filter(Boolean).join(": ");

  throw new Error(details ? `${action}: ${details}` : action);
}

function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;

  if (Array.isArray(error)) {
    return error.map(getErrorMessage).filter(Boolean).join("; ") || undefined;
  }

  if (typeof error !== "object") return String(error);

  const record = error as Record<string, unknown>;
  for (const key of ["message", "error", "detail", "description"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  if (record.errors) {
    const errors = getErrorMessage(record.errors);
    if (errors) return errors;
  }

  try {
    const serialized = JSON.stringify(error);
    return serialized === "{}" ? undefined : serialized;
  } catch {
    return undefined;
  }
}
