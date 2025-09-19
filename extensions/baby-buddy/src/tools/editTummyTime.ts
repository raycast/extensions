import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BabyBuddyAPI, TummyTimeEntry } from "../api";
import { formatErrorMessage } from "../utils/form-helpers";
import { calculateDuration, findChildByName, formatTimeToISO } from "../utils/normalizers";

type EditTummyTimeInput = {
  /**
   * The ID of the tummy time entry to edit
   */
  tummyTimeId: number;
  /**
   * The name of the child this tummy time is for
   */
  childName?: string;
  /**
   * Milestone achieved during tummy time
   */
  milestone?: string;
  /**
   * Notes about the tummy time
   */
  notes?: string;
  /**
   * Start time for the tummy time (ISO string or HH:MM:SS format)
   */
  startTime?: string;
  /**
   * End time for the tummy time (ISO string or HH:MM:SS format)
   */
  endTime?: string;
};

export default async function editTummyTime({
  tummyTimeId,
  childName,
  milestone,
  notes,
  startTime,
  endTime,
}: EditTummyTimeInput) {
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

  // Format times to ISO using utility function
  const formattedStartTime = formatTimeToISO(startTime);
  const formattedEndTime = formatTimeToISO(endTime);

  // Calculate duration if both start and end times are provided
  let duration: string | undefined;
  if (formattedStartTime && formattedEndTime) {
    duration = calculateDuration(formattedStartTime, formattedEndTime);
  }

  // Build the update data
  const updateData: Partial<TummyTimeEntry> = {};

  if (childId !== undefined) updateData.child = childId;
  if (formattedStartTime !== undefined) updateData.start = formattedStartTime;
  if (formattedEndTime !== undefined) updateData.end = formattedEndTime;
  if (duration !== undefined) updateData.duration = duration;
  if (milestone !== undefined) updateData.milestone = milestone;
  if (notes !== undefined) updateData.notes = notes;

  // Only proceed if there's something to update
  if (Object.keys(updateData).length === 0) {
    return { message: "No updates provided" };
  }

  try {
    const updatedTummyTime = await api.updateTummyTime(tummyTimeId, updateData);

    await showToast({
      style: Toast.Style.Success,
      title: "Tummy Time Updated",
      message: `Updated tummy time #${tummyTimeId}`,
    });

    return updatedTummyTime;
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: formatErrorMessage(error),
    });
  }
}
