import { BabyBuddyAPI, DiaperEntry } from "../api";
import { formatErrorMessage } from "../utils";
import { findChildByName } from "../utils/normalizers";

type GetDiapersInput = {
  /**
   * The name of the child to get diaper change entries for
   */
  childName: string;
  /**
   * Number of diaper change entries to retrieve (default: 10)
   */
  limit?: number;
  /**
   * Whether to return only today's diaper change entries (default: false)
   */
  todayOnly?: boolean;
};

export default async function getDiapers({
  childName,
  limit = 10,
  todayOnly = false,
}: GetDiapersInput): Promise<(DiaperEntry & { childName: string })[]> {
  try {
    const api = new BabyBuddyAPI();
    const children = await api.getChildren();

    // Find child using the utility function
    const child = findChildByName(children, childName);

    if (!child) {
      throw new Error(`Child with name ${childName} not found`);
    }

    let diapers: DiaperEntry[];

    if (todayOnly) {
      diapers = await api.getTodayDiapers(child.id);
    } else {
      // Get recent diaper change entries
      diapers = await api.getRecentDiapers(child.id, limit);
    }

    // Add child name to each diaper change entry
    const enhancedDiapers = diapers.map((entry) => ({
      ...entry,
      childName: `${child?.first_name || ""} ${child?.last_name || ""}`,
    }));

    return enhancedDiapers;
  } catch (error) {
    throw new Error(formatErrorMessage(error));
  }
}
