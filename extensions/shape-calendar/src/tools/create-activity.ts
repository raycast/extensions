import { createActivity } from "../api/client";

type Input = {
  /**
   * The date for the activity in ISO format (YYYY-MM-DD)
   */
  date: string;
  /**
   * A descriptive title for the activity
   */
  title: string;
  /**
   * The type of sport
   */
  sportType:
    | "run"
    | "bike"
    | "swim"
    | "hike"
    | "yoga"
    | "nordicski"
    | "strength"
    | "other";
  /**
   * Optional description or notes
   */
  description?: string;
  /**
   * Distance in meters
   */
  distance?: number;
  /**
   * Duration in seconds
   */
  duration?: number;
  /**
   * Whether the activity is already completed
   */
  completed?: boolean;
};

export default async function (input: Input) {
  const activity = await createActivity(input);
  return activity;
}
