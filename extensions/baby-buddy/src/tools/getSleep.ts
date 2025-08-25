import { BabyBuddyAPI, SleepEntry } from "../api";
import { findChildByName } from "../utils/normalizers";

type GetSleepInput = {
  /**
   * The name of the child to get sleep entries for
   */
  childName: string;
  /**
   * Number of sleep entries to retrieve (default: 10)
   */
  limit?: number;
  /**
   * Whether to return only today's sleep entries (default: false)
   */
  todayOnly?: boolean;
};

export default async function getSleep({
  childName,
  limit = 10,
  todayOnly = false,
}: GetSleepInput): Promise<(SleepEntry & { childName: string })[]> {
  try {
    const api = new BabyBuddyAPI();
    const children = await api.getChildren();

    // Find child using the utility function
    const child = findChildByName(children, childName);

    if (!child) {
      throw new Error(`Child with name ${childName} not found`);
    }

    let sleep: SleepEntry[];

    if (todayOnly) {
      sleep = await api.getTodaySleep(child.id);
    } else {
      // Get recent sleep entries
      sleep = await api.getRecentSleep(child.id, limit);
    }

    // Add child name to each sleep entry
    const enhancedSleep = sleep.map((entry) => ({
      ...entry,
      childName: `${child.first_name} ${child.last_name}`,
    }));

    return enhancedSleep;
  } catch (error) {
    throw new Error(`Error fetching sleep entries: ${error}`);
  }
}
