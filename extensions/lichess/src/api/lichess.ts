import type { LichessGame } from "../types/lichess";

const LICHESS_API_BASE_URL = "https://lichess.org/api";
const REALTIME_SEEK_TIMEOUT_MS = 15_000;
const REALTIME_SEEK_TIMEOUT_MESSAGE = "No opponent joined before the seek wait timed out. The Lichess seek was canceled.";
const REALTIME_SEEK_TIMEOUT_RESULT = Symbol("realtimeSeekTimeout");

export class LichessApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LichessApiError";
  }
}

export async function fetchRecentGames(username: string, max = 15): Promise<LichessGame[]> {
  const normalizedUsername = username.trim();
  const url = new URL(`${LICHESS_API_BASE_URL}/games/user/${encodeURIComponent(normalizedUsername)}`);

  url.searchParams.set("max", String(max));
  url.searchParams.set("pgnInJson", "true");
  url.searchParams.set("opening", "true");
  url.searchParams.set("evals", "false");
  url.searchParams.set("clocks", "false");
  url.searchParams.set("sort", "dateDesc");

  const response = await fetch(url, {
    headers: {
      Accept: "application/x-ndjson",
    },
  });

  if (response.status === 404) {
    throw new LichessApiError(`Lichess user "${normalizedUsername}" was not found.`, response.status);
  }

  if (!response.ok) {
    throw new LichessApiError(`Lichess returned HTTP ${response.status}.`, response.status);
  }

  const body = await response.text();
  return parseNdjson<LichessGame>(body);
}

export interface CreateSeekOptions {
  token: string;
  time: number;
  increment: number;
  rated: boolean;
  color: "random" | "white" | "black";
  variant: "standard";
}

interface BoardGameStartEvent {
  type: "gameStart";
  game?: {
    id?: string;
  };
}

export async function createRealtimeBoardSeek(
  options: CreateSeekOptions,
  timeoutMs = REALTIME_SEEK_TIMEOUT_MS,
): Promise<string | undefined> {
  const eventController = new AbortController();
  const seekController = new AbortController();
  const gameStart = waitForBoardGameStart(options.token, eventController.signal);
  let seekResponse: Response | undefined;

  try {
    seekResponse = await createBoardSeek(options, seekController.signal);
    const gameId = await withTimeout(gameStart, timeoutMs);

    if (gameId === REALTIME_SEEK_TIMEOUT_RESULT) {
      throw new LichessApiError(REALTIME_SEEK_TIMEOUT_MESSAGE);
    }

    return gameId;
  } finally {
    seekController.abort();
    eventController.abort();
    await closeResponseBody(seekResponse);
    void gameStart.catch(() => undefined);
  }
}

async function createBoardSeek(options: CreateSeekOptions, signal: AbortSignal): Promise<Response> {
  const body = new URLSearchParams({
    time: String(options.time),
    increment: String(options.increment),
    rated: String(options.rated),
    color: options.color,
    variant: options.variant,
  });

  const response = await fetch(`${LICHESS_API_BASE_URL}/board/seek`, {
    method: "POST",
    headers: {
      Accept: "application/x-ndjson",
      Authorization: `Bearer ${options.token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal,
  });

  await assertOkResponse(response);
  return response;
}

function parseNdjson<T>(body: string): T[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function waitForBoardGameStart(token: string, signal: AbortSignal): Promise<string | undefined> {
  const response = await fetch(`${LICHESS_API_BASE_URL}/stream/event`, {
    headers: {
      Accept: "application/x-ndjson",
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  await assertOkResponse(response);

  if (!response.body) {
    return undefined;
  }

  return readGameStartFromStream(response.body);
}

async function readGameStartFromStream(body: ReadableStream<Uint8Array>): Promise<string | undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      return undefined;
    }

    buffer += decoder.decode(value, { stream: true });
    const result = readGameStartFromBuffer(buffer);
    buffer = result.remaining;

    if (result.gameId) {
      return result.gameId;
    }
  }
}

function readGameStartFromBuffer(buffer: string): { gameId?: string; remaining: string } {
  const lines = buffer.split("\n");
  const remaining = lines.pop() ?? "";

  for (const line of lines) {
    const event = parseBoardEvent(line);

    if (event?.game?.id) {
      return { gameId: event.game.id, remaining };
    }
  }

  return { remaining };
}

function parseBoardEvent(line: string): BoardGameStartEvent | undefined {
  const trimmedLine = line.trim();

  if (!trimmedLine) {
    return undefined;
  }

  const event = JSON.parse(trimmedLine) as Partial<BoardGameStartEvent>;
  return event.type === "gameStart" ? (event as BoardGameStartEvent) : undefined;
}

async function assertOkResponse(response: Response): Promise<void> {
  if (response.status === 401 || response.status === 403) {
    throw new LichessApiError("The Lichess API token is invalid or missing the board:play scope.", response.status);
  }

  if (!response.ok) {
    throw new LichessApiError(await readErrorMessage(response), response.status);
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

async function closeResponseBody(response: Response | undefined): Promise<void> {
  try {
    await response?.body?.cancel();
  } catch {
    // The body may already be closed when Lichess accepts or expires the seek.
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | typeof REALTIME_SEEK_TIMEOUT_RESULT> {
  return Promise.race([
    promise,
    new Promise<typeof REALTIME_SEEK_TIMEOUT_RESULT>((resolve) => {
      setTimeout(() => resolve(REALTIME_SEEK_TIMEOUT_RESULT), timeoutMs);
    }),
  ]);
}
