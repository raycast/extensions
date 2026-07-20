import { unpairActivity } from "../api/client";

type Input = {
  /**
   * The ID of either activity in the pair (completed or planned). Both rows are unlinked.
   */
  activityId: string;
};

export default async function (input: Input) {
  const result = await unpairActivity(input.activityId);
  return result;
}
