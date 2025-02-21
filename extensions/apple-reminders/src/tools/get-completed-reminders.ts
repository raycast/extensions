import { getCompletedReminders } from "swift:../../swift/AppleReminders";

type Input = {
  /**
   * The ID of the list to get reminders from.
   */
  listId?: string;
};

export default async function (input: Input) {
  const reminders = await getCompletedReminders(input.listId);
  return reminders;
}
