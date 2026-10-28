export const REQUEST_TIMEOUT_MS = 15_000;

function errorMessageFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as { message?: unknown; error?: unknown };
  if (typeof candidate.message === "string") return candidate.message;
  if (typeof candidate.error === "string") return candidate.error;
  return null;
}

export async function responseErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  return (
    errorMessageFromBody(await response.json().catch(() => null)) ?? fallback
  );
}
