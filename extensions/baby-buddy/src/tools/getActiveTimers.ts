import { BabyBuddyAPI, Timer } from "../api";

interface ActiveTimer extends Timer {
  childName: string;
}

/**
 * Get all active timers
 *
 * For start time, show the time formatter hh:mm:ss with no padding zeros
 * For duration, show the time in normal language like "1 hour, 30 minutes, 10 seconds"
 */
export default async function (): Promise<ActiveTimer[]> {
  try {
    const api = new BabyBuddyAPI();
    const timers = await api.getActiveTimers();

    // Enhance timers with child names
    const enhancedTimers = await Promise.all(
      timers.map(async (timer) => {
        const childName = await api.getChildName(timer.child);
        return { ...timer, childName };
      }),
    );

    return enhancedTimers;
  } catch (error) {
    throw new Error("Failed to fetch active timers");
  }
}
