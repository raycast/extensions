type DailyUsageBucket = { startDate: string; tokens: number };

export function calculateRecentTokenUsage(
  buckets: DailyUsageBucket[],
  now = new Date(),
) {
  const today = formatLocalDate(now);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartDate = formatLocalDate(weekStart);
  const todayTokens =
    buckets.find((bucket) => bucket.startDate === today)?.tokens ?? 0;
  const lastSevenDaysTokens = buckets
    .filter(
      (bucket) =>
        bucket.startDate >= weekStartDate && bucket.startDate <= today,
    )
    .reduce((total, bucket) => total + bucket.tokens, 0);

  return { todayTokens, lastSevenDaysTokens };
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
