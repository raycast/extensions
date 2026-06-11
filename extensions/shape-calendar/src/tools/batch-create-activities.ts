import { batchCreateActivities } from "../api/client";

type Input = {
  /**
   * Array of activities to create (max 100). Each requires date (YYYY-MM-DD), title, and sportType. Optional: description, distance (meters), duration (seconds), completed.
   */
  activities: {
    date: string;
    title: string;
    sportType:
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
  const activities = await batchCreateActivities(input.activities);
  return activities;
}
