import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BabyBuddyAPI } from "../api";
import { formatErrorMessage, prepareSleepUpdateData } from "../utils/form-helpers";
import { findChildByName } from "../utils/normalizers";

type EditSleepInput = {
  /**
   * The ID of the sleep entry to edit
   */
  sleepId: number;
  /**
   * The name of the child this sleep is for
   */
  childName?: string;
  /**
   * Whether this is a nap (true) or night sleep (false)
   */
  isNap?: boolean;
  /**
   * Notes about the sleep
   */
  notes?: string;
  /**
   * Start time for the sleep (ISO string or HH:MM:SS format)
   */
  startTime?: string;
  /**
   * End time for the sleep (ISO string or HH:MM:SS format)
   */
  endTime?: string;
};

export default async function editSleep({ sleepId, childName, isNap, notes, startTime, endTime }: EditSleepInput) {
  const api = new BabyBuddyAPI();

  let childId: number | undefined;

  // If childName is provided, look up the child ID
  if (childName) {
    const children = await api.getChildren();
    const child = findChildByName(children, childName);

    if (!child) {
      throw new Error(`Child with name ${childName} not found`);
    }

    childId = child.id;
  }

  // Prepare update data using utility function
  const updateData = prepareSleepUpdateData({
    childId,
    startTime,
    endTime,
    isNap,
    notes,
  });

  // Only proceed if there's something to update
  if (Object.keys(updateData).length === 0) {
    throw new Error("No updates provided");
  }

  try {
    const updatedSleep = await api.updateSleep(sleepId, updateData);

    await showToast({
      style: Toast.Style.Success,
      title: "Sleep Updated",
      message: `Updated sleep #${sleepId}`,
    });

    return updatedSleep;
  } catch (error) {
    await showFailureToast({
      title: "Error Updating Sleep",
      message: formatErrorMessage(error),
    });
  }
}
