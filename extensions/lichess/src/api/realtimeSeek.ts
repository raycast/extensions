import { assertOkResponse, closeResponseBody, LICHESS_API_BASE_URL, LichessApiError } from "./client";

const REALTIME_SEEK_TIMEOUT_MS = 15_000;
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

export async function createRealtimeBoardSeek(
  options: CreateSeekOptions,
  timeoutMs = REALTIME_SEEK_TIMEOUT_MS,
): Promise<string> {
  const seekController = new AbortController();
  const initialGameIds = await fetchPlayingGameIds(options.token);
  let seekResponse: Response | undefined;
  let seekClosed: Promise<void> | undefined;

  try {
    seekResponse = await createBoardSeek(options, seekController.signal);
    seekClosed = waitForResponseBodyToClose(seekResponse);
    const seekResult = await withTimeout(seekClosed, timeoutMs);

    if (seekResult === REALTIME_SEEK_TIMEOUT_RESULT) {
      throw new LichessApiError(REALTIME_SEEK_TIMEOUT_MESSAGE);
    }

    const gameId = await findStartedSeekGame(options, initialGameIds);

    if (!gameId) {
      throw new LichessApiError(REALTIME_SEEK_ENDED_MESSAGE);
    }

    return gameId;
  } finally {
    seekController.abort();
    await closeResponseBody(seekResponse);
    void seekClosed?.catch(() => undefined);
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

async function findStartedSeekGame(
  options: CreateSeekOptions,
  initialGameIds: Set<string>,
): Promise<string | undefined> {
  const games = await fetchPlayingGames(options.token);
  const game = games.find((game) => {
    const gameId = gameIdForPlayingGame(game);
    return gameId !== undefined && !initialGameIds.has(gameId) && isMatchingSeekGame(game, options);
  });

  return gameIdForPlayingGame(game);
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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | typeof REALTIME_SEEK_TIMEOUT_RESULT> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<typeof REALTIME_SEEK_TIMEOUT_RESULT>((resolve) => {
        timeout = setTimeout(() => resolve(REALTIME_SEEK_TIMEOUT_RESULT), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
