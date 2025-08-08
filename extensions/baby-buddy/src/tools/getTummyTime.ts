import { BabyBuddyAPI, TummyTimeEntry } from "../api";
import { findChildByName } from "../utils/normalizers";

type GetTummyTimeInput = {
  /**
   * The name of the child to get tummy time entries for
   */
  childName: string;
  /**
   * Number of tummy time entries to retrieve (default: 10)
   */
  limit?: number;
  /**
   * Whether to return only today's tummy time entries (default: false)
   */
  todayOnly?: boolean;
};

export default async function getTummyTime({
  childName,
  limit = 10,
  todayOnly = false,
}: GetTummyTimeInput): Promise<(TummyTimeEntry & { childName: string })[]> {
  try {
    const api = new BabyBuddyAPI();
    const children = await api.getChildren();

    // Find child using the utility function
    const child = findChildByName(children, childName);

    if (!child) {
      throw new Error(`Child with name ${childName} not found`);
    }

    let tummyTime: TummyTimeEntry[];

    if (todayOnly) {
      tummyTime = await api.getTodayTummyTime(child.id);
    } else {
      // Get recent tummy time entries
      tummyTime = await api.getRecentTummyTime(child.id, limit);
    }

    // Add child name to each tummy time entry
    const enhancedTummyTime = tummyTime.map((entry) => ({
      ...entry,
      childName: `${child.first_name} ${child.last_name}`,
    }));

    return enhancedTummyTime;
  } catch (error) {
    throw new Error(`Error fetching tummy time entries: ${error}`);
  }
}
