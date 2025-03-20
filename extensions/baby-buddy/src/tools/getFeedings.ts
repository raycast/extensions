import { BabyBuddyAPI, FeedingEntry } from "../api";
import { findChildByName } from "../utils/normalizers";

type GetFeedingsInput = {
  /**
   * The name of the child to get feedings for
   */
  childName: string;
  /**
   * Number of feedings to retrieve (default: 10)
   */
  limit?: number;
  /**
   * Whether to return only today's feedings (default: false)
   */
  todayOnly?: boolean;
};

export default async function getFeedings({
  childName,
  limit = 10,
  todayOnly = false,
}: GetFeedingsInput): Promise<(FeedingEntry & { childName: string })[]> {
  const api = new BabyBuddyAPI();
  const children = await api.getChildren();

  // Find child using the utility function
  const child = findChildByName(children, childName);

  if (!child) {
    throw new Error(`Child with name ${childName} not found`);
  }

  let feedings: FeedingEntry[];

  if (todayOnly) {
    feedings = await api.getTodayFeedings(child.id);
  } else {
    // Get recent feedings
    feedings = await api.getRecentFeedings(child.id, limit);
  }

  // Add child name to each feeding
  const enhancedFeedings = feedings.map((feeding) => ({
    ...feeding,
    childName: `${child.first_name} ${child.last_name}`,
  }));

  return enhancedFeedings;
}
