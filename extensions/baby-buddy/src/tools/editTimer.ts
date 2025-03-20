import { showToast, Toast } from "@raycast/api";
import { BabyBuddyAPI } from "../api";
import { formatErrorMessage, prepareTimerUpdateData } from "../utils/form-helpers";
import { findChildByName } from "../utils/normalizers";

type EditTimerInput = {
  /**
   * The ID of the timer to edit
   */
  timerId: number;
  /**
   * The name of the child this timer is for
   */
  childName?: string;
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
export default async function editTimer({ timerId, childName, timerName, startTime, endTime }: EditTimerInput) {
  const api = new BabyBuddyAPI();

  // If childName is provided, look up the child ID
  if (childName) {
    const children = await api.getChildren();
    const child = findChildByName(children, childName);

    if (!child) {
      throw new Error(`Child with name ${childName} not found`);
    }

    // Note: We can't update the child association via the updateTimer API
    // If we need this functionality, we would need to extend the API
  }

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
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: formatErrorMessage(error),
    });

    throw error;
  }
}
