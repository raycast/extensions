import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BabyBuddyAPI } from "../api";
import { formatErrorMessage, prepareTimerUpdateData } from "../utils/form-helpers";

type EditTimerInput = {
  /**
   * The ID of the timer to edit
   */
  timerId: number;
  /**
   * The name of the timer
   */
  timerName?: string;
  /**
   * Start time for the timer (ISO string or HH:MM:SS format)
   */
  startTime?: string;
  /**
   * End time for the timer (ISO string or HH:MM:SS format)
   */
  endTime?: string;
};

/**
 * Update a timer
 */
export default async function editTimer({ timerId, timerName, startTime, endTime }: EditTimerInput) {
  const api = new BabyBuddyAPI();

  // Prepare update data using utility function
  const updateData = prepareTimerUpdateData({
    timerName,
    startTime,
    endTime,
  });

  // Only proceed if there's something to update
  if (Object.keys(updateData).length === 0) {
    return { message: "No updates provided" };
  }

  try {
    // Update timer with all data at once
    const updatedTimer = await api.updateTimer(timerId, updateData);

    await showToast({
      style: Toast.Style.Success,
      title: "Timer Updated",
      message: `Updated timer #${timerId}`,
    });

    return updatedTimer;
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: formatErrorMessage(error),
    });
  }
}
