import { getRoutines } from "../lib/api";

/**
 * Fetches a list of workout routines from the Hevy API.
 * Returns up to 10 routines per page with pagination information.
 * Use this tool when the user wants to see their workout routines or list their routines.
 */
export const fetchRoutines = async () => {
  try {
    const response = await getRoutines();
    return {
      routines: response.routines,
      pagination: {
        page: response.page,
        page_count: response.page_count,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch routines: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const confirmation = async () => {
  return {
    message: "Confirm fetching your routines from Hevy?",
    info: [
      { name: "Page", value: 1 },
      { name: "Page Size", value: 10 },
    ],
  };
};

export default fetchRoutines;
