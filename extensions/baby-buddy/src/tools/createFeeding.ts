import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BabyBuddyAPI } from "../api";
import { findChildByName } from "../utils/api-helpers";
import { createFeedingData } from "../utils/form-helpers";
import { formatErrorMessage } from "../utils/formatters";

/**
 * Create a new feeding entry for a child
 * @param childName - The name of the child
 * @param type - The type of feeding (breast milk, formula, solid food, fortified breast milk)
 * @param method - The feeding method (bottle, left breast, right breast, both breasts)
 * @param amount - The amount fed, if applicable
 * @param notes - Any notes about the feeding
 * @param startTime - The start time of the feeding (ISO string). If not provided, 5 minutes ago will be used.
 * @param endTime - The end time of the feeding (ISO string). If not provided, current time will be used.
 */
export default async function ({
  childName,
  type,
  method = "bottle",
  amount = "",
  notes = "",
  startTime,
  endTime = new Date().toISOString(),
}: {
  childName: string;
  type: string;
  method?: string;
  amount?: string;
  notes?: string;
  startTime?: string;
  endTime?: string;
}) {
  const api = new BabyBuddyAPI();
  const children = await api.getChildren();

  // Find child using the utility function
  const child = findChildByName(children, childName);

  if (!child) {
    throw new Error(`Child with name ${childName} not found`);
  }

  // Create complete feeding data using utility function
  const feedingData = createFeedingData({
    childId: child.id,
    startTime,
    endTime,
    type,
    method,
    amount,
    notes,
  });

  try {
    const newFeeding = await api.createFeeding(feedingData);

    await showToast({
      style: Toast.Style.Success,
      title: "Feeding Created",
      message: `Recorded ${feedingData.type} feeding for ${child.first_name}`,
    });

    return newFeeding;
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: formatErrorMessage(error),
    });
  }
}
