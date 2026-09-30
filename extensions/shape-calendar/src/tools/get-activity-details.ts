import { getActivityDetails } from "../api/client";

type Input = {
  /**
   * The ID of the completed activity
   */
  id: string;
  /**
   * Recorded channels to return. Omit to get everything that was recorded. Prefer leaving out lat/lng unless the question is about the route.
   */
  channels?: (
    | "time"
    | "lat"
    | "lng"
    | "altitude"
    | "distance"
    | "speed"
    | "heartRate"
    | "power"
    | "cadence"
    | "temperature"
  )[];
  /**
   * Number of points to return (10-2000). Omit for a modest default; raise only if resolutionSeconds is too coarse for the question.
   */
  points?: number;
  /**
   * Include lap splits. Defaults to true.
   */
  includeLaps?: boolean;
  /**
   * Include time in each training zone. Defaults to true.
   */
  includeZones?: boolean;
};

export default async function (input: Input) {
  const { id, ...params } = input;
  return getActivityDetails(id, params);
}
