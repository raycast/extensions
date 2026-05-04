/**
 * Habitify API Integration
 * Documentation: https://docs.habitify.me/
 */

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
        created_date: new Date().toISOString(),
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

/**
 * Get habit details including current progress
 * GET https://api.habitify.me/habits/:habit_id
 */
export async function getHabitProgress(
  apiKey: string,
  habitId: string,
): Promise<{ currentValue: number; targetValue: number } | null> {
  if (!apiKey || !habitId) {
    return null;
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await fetch(
      `${HABITIFY_API_BASE}/journal?target_date=${today}`,
      {
        method: "GET",
        headers: {
          Authorization: apiKey,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as {
      status: boolean;
      data: Array<{
        id: string;
        progress?: {
          current_value: number;
          target_value: number;
        };
      }>;
    };
    if (result.status && result.data) {
      // Find the habit by ID
      const habit = result.data.find((h) => h.id === habitId);
      if (habit && habit.progress) {
        return {
          currentValue: habit.progress.current_value || 0,
          targetValue: habit.progress.target_value || 0,
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Failed to get Habitify progress:", error);
    return null;
  }
}
