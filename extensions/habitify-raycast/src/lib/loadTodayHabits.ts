import { formatCacheTimestamp, habitifyCacheKeys, latestCacheTimestamp, readCache, writeCache } from "./cache";
import { formatUTCDate } from "./date";
import { getHabits, getTodayJournal, mergeJournalWithHabits, TodayHabit, Habit } from "./habitify";

type TodayJournalResponse = Awaited<ReturnType<typeof getTodayJournal>>;
type HabitCatalog = Awaited<ReturnType<typeof getHabits>>;

export type LoadTodayHabitsOptions = {
  areaId?: string;
};

export type LoadTodayHabitsResult = {
  habits: TodayHabit[];
  habitCatalog: Habit[];
  cacheNotice: string | null;
};

function resolveHabitsCacheKey(areaId?: string): string {
  return areaId ? habitifyCacheKeys.habitsByArea(areaId) : habitifyCacheKeys.activeHabits;
}

function mergeHabits(
  journalData: TodayJournalResponse["data"],
  habitCatalog: HabitCatalog,
  areaId?: string,
): TodayHabit[] {
  const merged = mergeJournalWithHabits(journalData, habitCatalog);
  if (!areaId) {
    return merged;
  }

  const areaHabitIds = new Set(habitCatalog.map((habit) => habit.id));
  return merged.filter((entry) => areaHabitIds.has(entry.id));
}

function cacheNoticeFromTimestamps(...timestamps: Array<string | undefined>): string | null {
  const cachedAt = latestCacheTimestamp(...timestamps);
  return cachedAt ? `Showing cached data from ${formatCacheTimestamp(cachedAt)}` : "Showing cached data";
}

export async function loadTodayHabits(
  apiKey: string,
  options: LoadTodayHabitsOptions = {},
): Promise<LoadTodayHabitsResult> {
  const { areaId } = options;
  const today = formatUTCDate(new Date());
  const journalCacheKey = habitifyCacheKeys.todayJournal(today);
  const habitsCacheKey = resolveHabitsCacheKey(areaId);

  const [cachedJournal, cachedHabits] = await Promise.all([
    readCache<TodayJournalResponse>(journalCacheKey),
    readCache<HabitCatalog>(habitsCacheKey),
  ]);

  let cacheNotice: string | null = null;
  if (cachedJournal && cachedHabits) {
    cacheNotice = cacheNoticeFromTimestamps(cachedJournal.savedAt, cachedHabits.savedAt);
  }

  const [journalResult, habitsResult] = await Promise.allSettled([
    getTodayJournal(apiKey, today),
    getHabits(apiKey, areaId ? { archived: false, areaId } : { archived: false }),
  ]);

  const journalData = journalResult.status === "fulfilled" ? journalResult.value.data : cachedJournal?.data.data;
  const habitCatalog = habitsResult.status === "fulfilled" ? habitsResult.value : cachedHabits?.data;

  if (!journalData || !habitCatalog) {
    throw new Error(
      journalResult.status === "rejected" && habitsResult.status === "rejected"
        ? "Habitify is unavailable and no cache exists yet."
        : "Habitify returned incomplete data.",
    );
  }

  if (journalResult.status === "fulfilled") {
    await writeCache(journalCacheKey, journalResult.value);
  }
  if (habitsResult.status === "fulfilled") {
    await writeCache(habitsCacheKey, habitsResult.value);
  }

  const habits = mergeHabits(journalData, habitCatalog, areaId);
  const usedCache = journalResult.status !== "fulfilled" || habitsResult.status !== "fulfilled";

  if (usedCache) {
    cacheNotice = cacheNoticeFromTimestamps(cachedJournal?.savedAt, cachedHabits?.savedAt);
  } else {
    cacheNotice = null;
  }

  return { habits, habitCatalog, cacheNotice };
}
