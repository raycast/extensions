import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BabyBuddyAPI } from "../api";
import { createSleepData, formatErrorMessage } from "../utils/form-helpers";
import { findChildByName } from "../utils/normalizers";

/**
 * Create a new sleep entry for a child
 * @param childName - The name of the child
 * @param notes - Any notes about the sleep
 * @param startTime - The start time of the sleep (ISO string). If not provided, 5 minutes ago will be used.
 * @param endTime - The end time of the sleep (ISO string). If not provided, current time will be used.
 * @param isNap - Whether this sleep is a nap (true) or night sleep (false)
 */
export default async function ({
  childName,
  notes = "",
  startTime,
  endTime,
  isNap = false,
}: {
  childName: string;
  notes?: string;
  startTime?: string;
  endTime?: string;
  isNap?: boolean;
}) {
  const api = new BabyBuddyAPI();
  const children = await api.getChildren();

  // Find child using the utility function
  const child = findChildByName(children, childName);

  if (!child) {
    throw new Error(`Child with name ${childName} not found`);
  }

  // Create complete sleep data using utility function
  const sleepData = createSleepData({
    childId: child.id,
    startTime,
    endTime,
    isNap,
    notes,
  });

  try {
    const newSleep = await api.createSleep(sleepData);

    await showToast({
      style: Toast.Style.Success,
      title: "Sleep Created",
      message: `Recorded ${isNap ? "nap" : "sleep"} session for ${child.first_name}`,
    });

    return newSleep;
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: formatErrorMessage(error),
    });
  }
}
