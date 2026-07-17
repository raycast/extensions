import { getWorkouts } from "../lib/api";

/**
 * Fetches a list of workouts from the Hevy API.
 * Returns up to 10 workouts per page with pagination information.
 * Use this tool when the user wants to see their workout history or list their workouts.
 */
export const fetchWorkouts = async () => {
  try {
    const response = await getWorkouts();
    return {
      workouts: response.workouts,
      pagination: {
        page: response.page,
        page_count: response.page_count,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch workouts: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const confirmation = async () => {
  return {
    message: "Confirm fetching your workouts from Hevy?",
    info: [
      { name: "Page", value: 1 },
      { name: "Page Size", value: 10 },
    ],
  };
};

export default fetchWorkouts;
