import { pairActivities } from "../api/client";

type Input = {
  /**
   * The ID of the completed activity (must have completed: true)
   */
  completedActivityId: string;
  /**
   * The ID of the planned activity (must have completed: false)
   */
  plannedActivityId: string;
};

export default async function (input: Input) {
  const result = await pairActivities(
    input.completedActivityId,
    input.plannedActivityId,
  );
  return result;
}
