import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BabyBuddyAPI } from "../api";
import { formatErrorMessage, prepareFeedingUpdateData } from "../utils/form-helpers";
import { findChildByName } from "../utils/normalizers";

type EditFeedingInput = {
  /**
   * The ID of the feeding entry to edit
   */
  feedingId: number;
  /**
   * The name of the child this feeding is for
   */
  childName?: string;
  /**
   * Valid options are Breast Milk, Formula, Fortified Breast Milk, Solid Food
   */
  type?: string;
  /**
   * Valid options are Bottle, left breast, right breast, both breasts
   */
  method?: string;
  /**
   * The amount of food or milk
   */
  amount?: string;
  /**
   * Notes about the feeding
   */
  notes?: string;
  /**
   * Start time for the feeding (ISO string or HH:MM:SS format)
   */
  startTime?: string;
  /**
   * End time for the feeding (ISO string or HH:MM:SS format)
   */
  endTime?: string;
};

export default async function editFeeding({
  feedingId,
  childName,
  type,
  method,
  amount,
  notes,
  startTime,
  endTime,
}: EditFeedingInput) {
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
  const updateData = prepareFeedingUpdateData({
    childId,
    startTime,
    endTime,
    type,
    method,
    amount,
    notes,
  });

  // Only proceed if there's something to update
  if (Object.keys(updateData).length === 0) {
    return { message: "No updates provided" };
  }

  try {
    const updatedFeeding = await api.updateFeeding(feedingId, updateData);

    await showToast({
      style: Toast.Style.Success,
      title: "Feeding Updated",
      message: `Updated feeding #${feedingId}`,
    });

    return updatedFeeding;
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: formatErrorMessage(error),
    });
  }
}
