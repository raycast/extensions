export const LICHESS_API_BASE_URL = "https://lichess.org/api";

export class LichessApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LichessApiError";
  }
}

export function parseNdjson<T>(body: string): T[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export async function assertOkResponse(response: Response): Promise<void> {
  if (response.status === 401 || response.status === 403) {
    throw new LichessApiError("The Lichess API token is invalid or missing the board:play scope.", response.status);
  }

  if (!response.ok) {
    throw new LichessApiError(await readErrorMessage(response), response.status);
  }
}

export async function closeResponseBody(response: Response | undefined): Promise<void> {
  try {
    await response?.body?.cancel();
  } catch {
    // The body may already be closed when Lichess accepts or expires the seek.
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallbackMessage = `Lichess returned HTTP ${response.status}.`;
  const body = await response.text();

  if (!body.trim()) {
    return fallbackMessage;
  }

  return extractJsonErrorMessage(body) ?? body;
}

function extractJsonErrorMessage(body: string): string | undefined {
  try {
    const payload = JSON.parse(body) as unknown;
    const messages = getStringMessages(payload);
    return messages.length > 0 ? messages.join(", ") : undefined;
  } catch {
    return undefined;
  }
}

function getStringMessages(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(getStringMessages);
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap(getStringMessages);
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
