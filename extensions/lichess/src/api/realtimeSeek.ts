import { withTimeout } from "../lib/async";
import { assertOkResponse, closeResponseBody, LICHESS_API_BASE_URL, LichessApiError } from "./client";

const REALTIME_SEEK_TIMEOUT_MS = 15_000;
const REALTIME_SEEK_GAME_START_GRACE_MS = 1_500;
const REALTIME_SEEK_TIMEOUT_MESSAGE =
  "No opponent joined before the seek wait timed out. The Lichess seek was canceled.";
const REALTIME_SEEK_ENDED_MESSAGE = "The Lichess seek ended before a matching game could be found.";
const REALTIME_SEEK_TIMEOUT_RESULT = Symbol("realtimeSeekTimeout");

export interface CreateSeekOptions {
  token: string;
  time: number;
  increment: number;
  rated: boolean;
  color: "random" | "white" | "black";
  variant: "standard";
}

interface AccountPlayingGame {
  gameId?: string;
  id?: string;
  color?: "white" | "black";
  rated?: boolean;
  secondsLeft?: number;
  source?: string;
  speed?: string;
  variant?: {
    key?: string;
  };
}

interface AccountPlayingResponse {
  nowPlaying?: AccountPlayingGame[];
}

interface IncomingEvent {
  type?: string;
  game?: AccountPlayingGame;
}

export async function createRealtimeBoardSeek(
  options: CreateSeekOptions,
  timeoutMs = REALTIME_SEEK_TIMEOUT_MS,
): Promise<string> {
  const seekController = new AbortController();
  const eventController = new AbortController();
  const initialGameIds = await fetchPlayingGameIds(options.token);
  let eventResponse: Response | undefined;
  let seekResponse: Response | undefined;
  let seekClosed: Promise<void> | undefined;
  let startedGame: Promise<string | undefined> | undefined;

  try {
    eventResponse = await openEventStream(options.token, eventController.signal);
    startedGame = findStartedSeekGameFromEvents(eventResponse, options, initialGameIds);
    seekResponse = await createBoardSeek(options, seekController.signal);
    seekClosed = waitForResponseBodyToClose(seekResponse);
    const seekResult = await withTimeout(
      waitForStartedSeekGame(seekClosed, startedGame),
      timeoutMs,
      REALTIME_SEEK_TIMEOUT_RESULT,
    );

    if (seekResult === REALTIME_SEEK_TIMEOUT_RESULT) {
      throw new LichessApiError(REALTIME_SEEK_TIMEOUT_MESSAGE);
    }

    if (!seekResult) {
      throw new LichessApiError(REALTIME_SEEK_ENDED_MESSAGE);
    }

    return seekResult;
  } finally {
    seekController.abort();
    eventController.abort();
    await closeResponseBody(seekResponse);
    await closeResponseBody(eventResponse);
    void seekClosed?.catch(() => undefined);
    void startedGame?.catch(() => undefined);
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

async function openEventStream(token: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(`${LICHESS_API_BASE_URL}/stream/event`, {
    headers: {
      Accept: "application/x-ndjson",
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  await assertOkResponse(response);
  return response;
}

async function waitForResponseBodyToClose(response: Response): Promise<void> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();

  while (true) {
    const { done } = await reader.read();

    if (done) {
      return;
    }
  }
}

async function fetchPlayingGameIds(token: string): Promise<Set<string>> {
  const games = await fetchPlayingGames(token);
  return new Set(games.map(gameIdForPlayingGame).filter((gameId): gameId is string => Boolean(gameId)));
}

async function waitForStartedSeekGame(
  seekClosed: Promise<void>,
  startedGame: Promise<string | undefined>,
): Promise<string | undefined> {
  const firstResult = await Promise.race([
    startedGame.then((gameId) => ({ type: "game" as const, gameId })),
    seekClosed.then(() => ({ type: "seekClosed" as const })),
  ]);

  if (firstResult.type === "game") {
    return firstResult.gameId;
  }

  const gameId = await withTimeout(startedGame, REALTIME_SEEK_GAME_START_GRACE_MS, REALTIME_SEEK_TIMEOUT_RESULT);
  return gameId === REALTIME_SEEK_TIMEOUT_RESULT ? undefined : gameId;
}

async function findStartedSeekGameFromEvents(
  response: Response,
  options: CreateSeekOptions,
  initialGameIds: Set<string>,
): Promise<string | undefined> {
  if (!response.body) {
    return undefined;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      return parseStartedSeekGameFromEventLines(buffer, options, initialGameIds);
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    const gameId = parseStartedSeekGameFromEventLines(lines.join("\n"), options, initialGameIds);

    if (gameId) {
      return gameId;
    }
  }
}

function parseStartedSeekGameFromEventLines(
  lines: string,
  options: CreateSeekOptions,
  initialGameIds: Set<string>,
): string | undefined {
  for (const line of lines.split("\n")) {
    const event = parseIncomingEventLine(line);

    if (event?.type !== "gameStart") {
      continue;
    }

    const gameId = gameIdForPlayingGame(event.game);

    if (gameId !== undefined && !initialGameIds.has(gameId) && event.game && isMatchingSeekGame(event.game, options)) {
      return gameId;
    }
  }

  return undefined;
}

function parseIncomingEventLine(line: string): IncomingEvent | undefined {
  const trimmed = line.trim();

  if (!trimmed) {
    return undefined;
  }

  return JSON.parse(trimmed) as IncomingEvent;
}

async function fetchPlayingGames(token: string): Promise<AccountPlayingGame[]> {
  const url = new URL(`${LICHESS_API_BASE_URL}/account/playing`);
  url.searchParams.set("nb", "50");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  await assertOkResponse(response);

  const payload = (await response.json()) as AccountPlayingResponse;
  return Array.isArray(payload.nowPlaying) ? payload.nowPlaying : [];
}

function gameIdForPlayingGame(game: AccountPlayingGame | undefined): string | undefined {
  return game?.gameId ?? game?.id;
}

function isMatchingSeekGame(game: AccountPlayingGame, options: CreateSeekOptions): boolean {
  return (
    game.variant?.key === options.variant &&
    game.rated === options.rated &&
    matchesRequestedColor(game, options.color) &&
    matchesRealtimeClock(game, options) &&
    matchesPublicSeekSource(game)
  );
}

function matchesRequestedColor(game: AccountPlayingGame, color: CreateSeekOptions["color"]): boolean {
  return color === "random" || game.color === color;
}

function matchesRealtimeClock(game: AccountPlayingGame, options: CreateSeekOptions): boolean {
  if (typeof game.secondsLeft !== "number") {
    return false;
  }

  const initialSeconds = options.time * 60;
  return game.secondsLeft >= initialSeconds - 30 && game.secondsLeft <= initialSeconds + options.increment;
}

function matchesPublicSeekSource(game: AccountPlayingGame): boolean {
  return game.source === "lobby" || game.source === "api";
}
