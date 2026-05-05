import { createActivity } from "../api/client";

type Input = {
  /**
   * The date for the activity in ISO format (YYYY-MM-DD)
   */
  date: string;
  /**
   * A short descriptive title. Don't include distance/duration in the title.
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
  /**
   * The workout goal: "distance", "time", "pace", or "steps" (for structured intervals)
   */
  target?: "distance" | "time" | "pace" | "steps";
  /**
   * JSON string of structured workout steps array. Only include for workouts with specific intervals (e.g. 5x400m). Set target to "steps" when using this. Never use for strength training. Example: [{"stepType":"warmup","displayName":"Warmup","endCondition":"time","endConditionValue":600,"targetType":"no.target"},{"stepType":"repeat","numberOfIterations":5,"workoutSteps":[{"stepType":"interval","displayName":"400m fast","endCondition":"distance","endConditionValue":400,"targetType":"pace","targetValueOne":210,"targetValueTwo":240},{"stepType":"recovery","displayName":"90s jog","endCondition":"time","endConditionValue":90,"targetType":"no.target"}]},{"stepType":"cooldown","displayName":"Cooldown","endCondition":"time","endConditionValue":600,"targetType":"no.target"}]
   */
  stepsJson?: string;
};

export default async function (input: Input) {
  const { stepsJson, ...rest } = input;
  const body = {
    ...rest,
    ...(stepsJson
      ? (() => {
          try {
            return { steps: JSON.parse(stepsJson) };
          } catch {
            throw new Error(
              "Invalid steps JSON — could not parse the structured workout steps.",
            );
          }
        })()
      : {}),
  };
  const activity = await createActivity(body);
  return activity;
}
