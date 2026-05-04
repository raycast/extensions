/**
 * Habitify API Integration
 * Documentation: https://docs.habitify.me/
 */
import { formatLocalDateKey } from "./storage";

const HABITIFY_API_BASE = "https://api.habitify.me";

interface HabitifyLogResponse {
  message: string;
  data: unknown;
  status: boolean;
  version: string;
}

/**
 * Add a water log entry to Habitify
 * POST https://api.habitify.me/logs/:habit_id
 */
export async function addHabitifyLog(
  apiKey: string,
  habitId: string,
  amount: number,
  unitType: string = "ml",
): Promise<boolean> {
  if (!apiKey || !habitId) {
    console.log("Habitify: API key or Habit ID not configured");
    return false;
  }

  try {
    const response = await fetch(`${HABITIFY_API_BASE}/logs/${habitId}`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: amount,
        unit_type: unitType,
        created_date: `${formatLocalDateKey(new Date())}T00:00:00.000Z`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Habitify API error:", response.status, errorText);
      return false;
    }

    const result = (await response.json()) as HabitifyLogResponse;
    console.log("Habitify log result:", result);
    return result.status === true;
  } catch (error) {
    console.error("Habitify sync failed:", error);
    return false;
  }
}
