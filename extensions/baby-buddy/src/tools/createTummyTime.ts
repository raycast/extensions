import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BabyBuddyAPI } from "../api";
import { formatErrorMessage } from "../utils/form-helpers";
import { calculateDuration, findChildByName, formatTimeToISO } from "../utils/normalizers";

/**
 * Create a new tummy time entry for a child
 * @param childName - The name of the child
 * @param milestone - Any milestone achieved during tummy time
 * @param notes - Any notes about the tummy time
 * @param startTime - The start time of the tummy time (ISO string). If not provided, 5 minutes ago will be used.
 * @param endTime - The end time of the tummy time (ISO string). If not provided, current time will be used.
 */
export default async function ({
  childName,
  milestone = "",
  notes = "",
  startTime,
  endTime,
}: {
  childName: string;
  milestone?: string;
  notes?: string;
  startTime?: string;
  endTime?: string;
}) {
  try {
    const api = new BabyBuddyAPI();
    const children = await api.getChildren();

    // Find child using the utility function
    const child = findChildByName(children, childName);

    if (!child) {
      throw new Error(`Child with name ${childName} not found`);
    }

    // Set default times if not provided
    const now = new Date();
    const defaultStartTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

    // Format times to ISO using utility function
    const formattedStartTime = formatTimeToISO(startTime) || defaultStartTime.toISOString();
    const formattedEndTime = formatTimeToISO(endTime) || now.toISOString();

    // Validate that end time is after start time
    if (new Date(formattedEndTime) <= new Date(formattedStartTime)) {
      throw new Error("End time must be after start time");
    }

    // Calculate duration using utility function
    const duration = calculateDuration(formattedStartTime, formattedEndTime);

    // Create the tummy time entry
    const tummyTimeData = {
      child: child.id,
      start: formattedStartTime,
      end: formattedEndTime,
      duration,
      milestone,
      notes,
    };

    const newTummyTime = await api.createTummyTime(tummyTimeData);

    await showToast({
      style: Toast.Style.Success,
      title: "Tummy Time Created",
      message: `Recorded tummy time for ${child.first_name}`,
    });

    return newTummyTime;
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: formatErrorMessage(error),
    });
  }
}
