import { mkdir, open, rm, stat } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { join } from "node:path";

import { LocalStorage, environment } from "@raycast/api";

const ACTIVITY_STATE_KEY = "activityState";
const FAVORITE_TIMERS_KEY = "favoriteTimers";
const LEGACY_ACTIVE_ACTIVITY_KEY = "activeActivity";
const ACTIVITY_LOCK_PATH = join(
  environment.supportPath,
  ".seconds-clock-activity.lock",
);
const LOCK_TIMEOUT_MS = 5000;
const LOCK_STALE_MS = 10000;
const LOCK_RETRY_MS = 25;
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DURATION_TOKEN_PATTERN =
  /(\d+)\s*(hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)/gi;
const MALFORMED_DURATION_PATTERN =
  /(?:^|\s)[+-]?\d+\.\d+\s*(?:hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b|(?:^|\s)[+-]\s*\d+\s*(?:hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b/i;

export type TimerActivity = {
  id: string;
  name?: string;
  durationMs: number;
  startedAt: number;
  endsAt: number;
};

export type StopwatchActivity = {
  startedAt: number;
};

export type ActivityState = {
  timers: TimerActivity[];
  stopwatch?: StopwatchActivity;
};

export type FavoriteTimer = {
  id: string;
  name?: string;
  durationMs: number;
};

export type ParsedTimerInput = {
  durationMs: number;
  name?: string;
};

type LegacyActiveActivity =
  | (Omit<TimerActivity, "id"> & { type: "timer" })
  | (StopwatchActivity & { type: "stopwatch" });

const emptyActivityState = (): ActivityState => ({
  timers: [],
});

export async function getActivityState(): Promise<ActivityState> {
  return withActivityLock(getActivityStateUnlocked);
}

export async function addTimer(
  durationMs: number,
  name?: string,
): Promise<TimerActivity> {
  const { result } = await updateActivityState((state) => {
    const timer = createTimerActivity(durationMs, name);
    const timers = sortTimersByEnding([...state.timers, timer]);

    return {
      state: {
        ...state,
        timers,
      },
      result: timer,
    };
  });

  return result;
}

export async function updateTimerName(
  timerId: string,
  name?: string,
): Promise<boolean> {
  const { result } = await updateActivityState((currentState) => ({
    state: {
      ...currentState,
      timers: currentState.timers.map((timer) =>
        timer.id === timerId
          ? {
              ...timer,
              name: name?.trim() || undefined,
            }
          : timer,
      ),
    },
    result: currentState.timers.some((timer) => timer.id === timerId),
  }));

  return result;
}

export async function extendTimer(
  timerId: string,
  additionalMs: number,
): Promise<boolean> {
  const { result } = await updateActivityState((currentState) => ({
    state: {
      ...currentState,
      timers: currentState.timers.map((timer) =>
        timer.id === timerId
          ? {
              ...timer,
              durationMs: timer.durationMs + additionalMs,
              endsAt: timer.endsAt + additionalMs,
            }
          : timer,
      ),
    },
    result: currentState.timers.some((timer) => timer.id === timerId),
  }));

  return result;
}

export async function removeTimer(timerId: string): Promise<boolean> {
  const { result } = await updateActivityState((currentState) => {
    const timers = currentState.timers.filter((timer) => timer.id !== timerId);

    return {
      state: {
        ...currentState,
        timers,
      },
      result: timers.length !== currentState.timers.length,
    };
  });

  return result;
}

export async function removeAllTimers(): Promise<ActivityState> {
  const { state } = await updateActivityState((currentState) => ({
    state: {
      ...currentState,
      timers: [],
    },
    result: undefined,
  }));

  return state;
}

export async function startStopwatch(): Promise<void> {
  await updateActivityState((state) => ({
    state: {
      ...state,
      stopwatch: createStopwatchActivity(),
    },
    result: undefined,
  }));
}

export async function stopStopwatch(): Promise<boolean> {
  const { result } = await updateActivityState((currentState) => ({
    state: {
      ...currentState,
      stopwatch: undefined,
    },
    result: currentState.stopwatch !== undefined,
  }));

  return result;
}

export async function removeCompletedTimers(
  now = Date.now(),
): Promise<TimerActivity[]> {
  return withActivityLock(async () => {
    const state = await getActivityStateUnlocked();
    const completedTimers = state.timers.filter(
      (timer) => getTimerRemainingMs(timer, now) === 0,
    );

    if (completedTimers.length === 0) {
      return [];
    }

    const completedTimerIds = new Set(completedTimers.map((timer) => timer.id));
    const timers = state.timers.filter(
      (timer) => !completedTimerIds.has(timer.id),
    );
    await saveActivityStateUnlocked({
      ...state,
      timers,
    });

    return completedTimers;
  });
}

async function getActivityStateUnlocked(): Promise<ActivityState> {
  const storedState = await LocalStorage.getItem<string>(ACTIVITY_STATE_KEY);

  if (storedState) {
    try {
      return normalizeActivityState(
        JSON.parse(storedState) as Partial<ActivityState>,
      );
    } catch {
      await LocalStorage.removeItem(ACTIVITY_STATE_KEY);
    }
  }

  return migrateLegacyActivityState();
}

async function saveActivityStateUnlocked(state: ActivityState): Promise<void> {
  await LocalStorage.setItem(
    ACTIVITY_STATE_KEY,
    JSON.stringify(normalizeActivityState(state)),
  );
}

type ActivityMutationResult<T> = {
  state: ActivityState;
  result: T;
};

async function updateActivityState<T>(
  mutate: (state: ActivityState) => ActivityMutationResult<T>,
): Promise<ActivityMutationResult<T>> {
  return withActivityLock(async () => {
    const currentState = await getActivityStateUnlocked();
    const { state, result } = mutate(currentState);
    const nextState = normalizeActivityState(state);

    await saveActivityStateUnlocked(nextState);

    return {
      state: nextState,
      result,
    };
  });
}

async function withActivityLock<T>(operation: () => Promise<T>): Promise<T> {
  // Raycast can run different commands in separate processes. LocalStorage
  // has no compare-and-swap operation, so serialize every read-modify-write
  // transaction through a lock shared by those processes.
  const startedAt = Date.now();
  let lockHandle: FileHandle | undefined;

  while (!lockHandle) {
    try {
      await mkdir(environment.supportPath, { recursive: true });
      lockHandle = await open(ACTIVITY_LOCK_PATH, "wx");
      await lockHandle.writeFile(`${process.pid}\n`);
    } catch (error) {
      if (lockHandle) {
        await lockHandle.close().catch(() => undefined);
        lockHandle = undefined;
        await rm(ACTIVITY_LOCK_PATH, { force: true }).catch(() => undefined);
      }

      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }

      if (await isStaleActivityLock()) {
        await rm(ACTIVITY_LOCK_PATH, { force: true });
        continue;
      }

      if (Date.now() - startedAt >= LOCK_TIMEOUT_MS) {
        throw new Error("Timed out waiting for the activity lock");
      }

      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }

  try {
    return await operation();
  } finally {
    await lockHandle.close().catch(() => undefined);
    await rm(ACTIVITY_LOCK_PATH, { force: true }).catch(() => undefined);
  }
}

async function isStaleActivityLock(): Promise<boolean> {
  try {
    const lockStats = await stat(ACTIVITY_LOCK_PATH);
    return Date.now() - lockStats.mtimeMs > LOCK_STALE_MS;
  } catch {
    return false;
  }
}

export async function getFavoriteTimers(): Promise<FavoriteTimer[]> {
  return withActivityLock(getFavoriteTimersUnlocked);
}

async function getFavoriteTimersUnlocked(): Promise<FavoriteTimer[]> {
  const storedFavorites =
    await LocalStorage.getItem<string>(FAVORITE_TIMERS_KEY);

  if (!storedFavorites) {
    return [];
  }

  try {
    const parsedFavorites = JSON.parse(storedFavorites) as unknown;

    if (!Array.isArray(parsedFavorites)) {
      throw new Error("Invalid favorites");
    }

    const favorites = parsedFavorites.filter(isValidFavoriteTimer);

    if (favorites.length !== parsedFavorites.length) {
      await LocalStorage.setItem(
        FAVORITE_TIMERS_KEY,
        JSON.stringify(favorites),
      );
    }

    return favorites;
  } catch {
    await LocalStorage.removeItem(FAVORITE_TIMERS_KEY);
    return [];
  }
}

export async function addFavoriteTimer(
  durationMs: number,
  name?: string,
): Promise<FavoriteTimer> {
  return withActivityLock(async () => {
    const favorites = await getFavoriteTimersUnlocked();
    const favorite = {
      id: createActivityId(),
      name: name?.trim() || undefined,
      durationMs,
    };

    await LocalStorage.setItem(
      FAVORITE_TIMERS_KEY,
      JSON.stringify([...favorites, favorite]),
    );

    return favorite;
  });
}

export async function removeFavoriteTimer(favoriteId: string): Promise<void> {
  await withActivityLock(async () => {
    const favorites = await getFavoriteTimersUnlocked();

    await LocalStorage.setItem(
      FAVORITE_TIMERS_KEY,
      JSON.stringify(
        favorites.filter((favorite) => favorite.id !== favoriteId),
      ),
    );
  });
}

export function getDefaultTimer(
  timers: TimerActivity[],
): TimerActivity | undefined {
  return sortTimersByEnding(timers)[0];
}

export function sortTimersByEnding(timers: TimerActivity[]): TimerActivity[] {
  return [...timers].sort((firstTimer, secondTimer) => {
    if (firstTimer.endsAt !== secondTimer.endsAt) {
      return firstTimer.endsAt - secondTimer.endsAt;
    }

    return firstTimer.startedAt - secondTimer.startedAt;
  });
}

export function createTimerActivity(
  durationMs: number,
  name?: string,
): TimerActivity {
  const startedAt = Date.now();

  return {
    id: createActivityId(),
    name: name?.trim() || undefined,
    durationMs,
    startedAt,
    endsAt: startedAt + durationMs,
  };
}

export function createStopwatchActivity(): StopwatchActivity {
  return {
    startedAt: Date.now(),
  };
}

export function getTimerRemainingMs(
  timer: TimerActivity,
  now = Date.now(),
): number {
  return Math.max(0, timer.endsAt - now);
}

export function getStopwatchElapsedMs(
  stopwatch: StopwatchActivity,
  now = Date.now(),
): number {
  return Math.max(0, now - stopwatch.startedAt);
}

export function formatActivityDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / SECOND_MS));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((part) => part.toString().padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":");
}

export function parseDurationInput(value: string): number {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return 0;
  }

  if (/^\d+(:\d{1,2}){1,2}$/.test(normalizedValue)) {
    return parseColonDuration(normalizedValue);
  }

  const matches = [...normalizedValue.matchAll(DURATION_TOKEN_PATTERN)];

  if (matches.length > 0) {
    const remainingInput = normalizedValue
      .replace(DURATION_TOKEN_PATTERN, "")
      .replace(/\band\b/g, "")
      .trim();

    if (remainingInput) {
      return Number.NaN;
    }

    return matches.reduce((durationMs, match) => {
      const amount = Number(match[1]);
      const unit = match[2];

      if (unit.startsWith("h")) {
        return durationMs + amount * HOUR_MS;
      }

      if (unit.startsWith("m")) {
        return durationMs + amount * MINUTE_MS;
      }

      return durationMs + amount * SECOND_MS;
    }, 0);
  }

  const minutes = Number(normalizedValue);

  if (!Number.isInteger(minutes) || minutes < 0) {
    return Number.NaN;
  }

  return minutes * MINUTE_MS;
}

export function parseTimerInput(value: string): ParsedTimerInput | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  if (MALFORMED_DURATION_PATTERN.test(normalizedValue)) {
    return undefined;
  }

  const durationMs = parseDurationInput(normalizedValue);

  if (Number.isFinite(durationMs) && durationMs > 0) {
    return {
      durationMs,
    };
  }

  const durationMatches = [...normalizedValue.matchAll(DURATION_TOKEN_PATTERN)];

  if (durationMatches.length === 0) {
    return undefined;
  }

  const durationText = durationMatches.map((match) => match[0]).join(" ");
  const parsedDurationMs = parseDurationInput(durationText);

  if (!Number.isFinite(parsedDurationMs) || parsedDurationMs <= 0) {
    return undefined;
  }

  const name = normalizedValue
    .replace(DURATION_TOKEN_PATTERN, "")
    .replace(/\band\b/gi, "")
    .trim();

  return {
    durationMs: parsedDurationMs,
    name: name || undefined,
  };
}

export function formatDurationWords(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / SECOND_MS));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [
    formatDurationPart(hours, "hour"),
    formatDurationPart(minutes, "minute"),
    formatDurationPart(seconds, "second"),
  ].filter(Boolean);

  return parts.join(" ");
}

export function getTimerTitle(timer: TimerActivity): string {
  return timer.name || "Timer";
}

function normalizeActivityState(
  state: Partial<ActivityState> | null | undefined,
): ActivityState {
  const timers = sortTimersByEnding(
    (Array.isArray(state?.timers) ? state.timers : []).filter(
      isValidTimerActivity,
    ),
  );
  return {
    timers,
    stopwatch: isValidStopwatchActivity(state?.stopwatch)
      ? state.stopwatch
      : undefined,
  };
}

async function migrateLegacyActivityState(): Promise<ActivityState> {
  const legacyActivity = await LocalStorage.getItem<string>(
    LEGACY_ACTIVE_ACTIVITY_KEY,
  );

  if (!legacyActivity) {
    return emptyActivityState();
  }

  try {
    const activity = JSON.parse(legacyActivity) as unknown;
    let state: ActivityState;

    if (isValidLegacyTimer(activity)) {
      state = normalizeActivityState({
        timers: [
          {
            id: createActivityId(),
            name: activity.name,
            durationMs: activity.durationMs,
            startedAt: activity.startedAt,
            endsAt: activity.endsAt,
          },
        ],
      });
    } else if (isValidLegacyStopwatch(activity)) {
      state = normalizeActivityState({
        timers: [],
        stopwatch: {
          startedAt: activity.startedAt,
        },
      });
    } else {
      throw new Error("Invalid legacy activity");
    }

    try {
      await saveActivityStateUnlocked(state);
      await LocalStorage.removeItem(LEGACY_ACTIVE_ACTIVITY_KEY);
      return state;
    } catch {
      return emptyActivityState();
    }
  } catch {
    await LocalStorage.removeItem(LEGACY_ACTIVE_ACTIVITY_KEY);
    return emptyActivityState();
  }
}

function createActivityId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseColonDuration(value: string): number {
  const parts = value.split(":").map(Number);

  if (parts.some((part) => !Number.isInteger(part) || part < 0)) {
    return Number.NaN;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;

    if (seconds > 59) {
      return Number.NaN;
    }

    return minutes * MINUTE_MS + seconds * SECOND_MS;
  }

  const [hours, minutes, seconds] = parts;

  if (minutes > 59 || seconds > 59) {
    return Number.NaN;
  }

  return hours * HOUR_MS + minutes * MINUTE_MS + seconds * SECOND_MS;
}

function formatDurationPart(value: number, label: string): string | undefined {
  if (value === 0) {
    return undefined;
  }

  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

function isValidTimerActivity(value: unknown): value is TimerActivity {
  if (!value || typeof value !== "object") {
    return false;
  }

  const timer = value as Partial<TimerActivity>;

  return (
    typeof timer.id === "string" &&
    timer.id.length > 0 &&
    isPositiveFiniteNumber(timer.durationMs) &&
    isFiniteNumber(timer.startedAt) &&
    isFiniteNumber(timer.endsAt) &&
    (timer.name === undefined || typeof timer.name === "string")
  );
}

function isValidStopwatchActivity(value: unknown): value is StopwatchActivity {
  return Boolean(
    value &&
    typeof value === "object" &&
    isFiniteNumber((value as Partial<StopwatchActivity>).startedAt),
  );
}

function isValidFavoriteTimer(value: unknown): value is FavoriteTimer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const favorite = value as Partial<FavoriteTimer>;

  return (
    typeof favorite.id === "string" &&
    favorite.id.length > 0 &&
    isPositiveFiniteNumber(favorite.durationMs) &&
    (favorite.name === undefined || typeof favorite.name === "string")
  );
}

function isValidLegacyTimer(value: unknown): value is LegacyActiveActivity & {
  type: "timer";
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const activity = value as Partial<LegacyActiveActivity>;

  return (
    activity.type === "timer" &&
    isPositiveFiniteNumber(activity.durationMs) &&
    isFiniteNumber(activity.startedAt) &&
    isFiniteNumber(activity.endsAt) &&
    (activity.name === undefined || typeof activity.name === "string")
  );
}

function isValidLegacyStopwatch(
  value: unknown,
): value is LegacyActiveActivity & { type: "stopwatch" } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const activity = value as Partial<LegacyActiveActivity>;

  return activity.type === "stopwatch" && isFiniteNumber(activity.startedAt);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}
