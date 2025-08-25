import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BabyBuddyAPI } from "../api";
import { findChildByName } from "../utils/api-helpers";
import { createTimerData } from "../utils/form-helpers";
import { formatErrorMessage } from "../utils/formatters";

/**
 * Create a new timer for a child
 * @param childName - The name of the child
 * @param name - Name for the timer (e.g., "Feeding", "Sleep", "Tummy Time")
 * @param time - The start time for the timer. If not provided, current time will be used.
 */
export default async function ({ childName, name, time }: { childName: string; name: string; time?: string }) {
  const api = new BabyBuddyAPI();
  const children = await api.getChildren();

  // Find child using the utility function
  const child = findChildByName(children, childName);

  if (!child) {
    throw new Error(`Child with name ${childName} not found`);
  }

  // Create timer data using utility function
  const timerData = createTimerData({
    childId: child.id,
    name,
    startTime: time ? new Date(time) : undefined,
  });

  try {
    // Call API with the correct parameters
    const newTimer = await api.createTimer(child.id, timerData.name, timerData.start);

    await showToast({
      style: Toast.Style.Success,
      title: "Timer Created",
      message: `Started ${name} timer for ${child.first_name}`,
    });

    return newTimer;
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: formatErrorMessage(error),
    });
  }
}
