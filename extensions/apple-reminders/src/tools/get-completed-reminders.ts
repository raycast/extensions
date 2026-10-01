import { getCompletedReminders } from "swift:../../swift/AppleReminders";

type Input = {
  /**
   * List ID, or "all", "today", "overdue", or "scheduled". Defaults to all lists.
   */
  listId?: string;
  /** Search words in titles, notes, tags, and priorities before the 1,000-result limit is applied. */
  searchText?: string;
};

export default async function (input: Input) {
  const reminders = await getCompletedReminders(input.listId, input.searchText);
  return reminders;
}
