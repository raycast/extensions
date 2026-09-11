import { batchUpdateActivities } from "../api/client";

type Input = {
  /**
   * Array of activity updates (max 100). Each must include an id and any fields to change: date, title, sportType, description, distance (meters), duration (seconds), completed, etc.
   */
  activities: {
    id: string;
    date?: string;
    title?: string;
    sportType?:
      | "run"
      | "bike"
      | "swim"
      | "hike"
      | "yoga"
      | "nordicski"
      | "strength"
      | "other";
    description?: string;
    distance?: number;
    duration?: number;
    completed?: boolean;
  }[];
};

export default async function (input: Input) {
  const result = await batchUpdateActivities(input.activities);
  return result;
}
