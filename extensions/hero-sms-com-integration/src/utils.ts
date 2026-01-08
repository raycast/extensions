// Utility function for calculating remaining time from local storage
export function getRemainingTimeFromLocal(localCreatedAt: number | null): {
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  console.log(`[DEBUG] getRemainingTimeFromLocal called with:`, {
    localCreatedAt,
    localCreatedAtDate: localCreatedAt ? new Date(localCreatedAt).toISOString() : null,
  });

  if (!localCreatedAt) {
    console.log(`[DEBUG] getRemainingTimeFromLocal: No localCreatedAt, returning expired`);
    return { minutes: 0, seconds: 0, expired: true };
  }

  const now = Date.now();
  const timeElapsed = now - localCreatedAt;
  const totalDuration = 20 * 60 * 1000; // 20 minutes in milliseconds
  const remaining = totalDuration - timeElapsed;

  console.log(`[DEBUG] getRemainingTimeFromLocal calculation:`, {
    now,
    nowDate: new Date(now).toISOString(),
    localCreatedAt,
    localCreatedAtDate: new Date(localCreatedAt).toISOString(),
    timeElapsed,
    timeElapsedSeconds: Math.floor(timeElapsed / 1000),
    totalDuration,
    remaining,
    remainingSeconds: Math.floor(remaining / 1000),
  });

  if (remaining <= 0) {
    console.log(`[DEBUG] getRemainingTimeFromLocal: Remaining <= 0, returning expired`);
    return { minutes: 0, seconds: 0, expired: true };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Cap at 20 minutes
  if (minutes > 20) {
    console.log(`[DEBUG] getRemainingTimeFromLocal: Minutes > 20, capping at 20`);
    return { minutes: 20, seconds: 0, expired: false };
  }

  const result = { minutes, seconds, expired: false };
  console.log(`[DEBUG] getRemainingTimeFromLocal result:`, result);
  return result;
}
