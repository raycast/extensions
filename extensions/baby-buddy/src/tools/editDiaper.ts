import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BabyBuddyAPI } from "../api";
import { formatErrorMessage, prepareDiaperUpdateData } from "../utils/form-helpers";
import { findChildByName } from "../utils/normalizers";

type EditDiaperInput = {
  /**
   * The ID of the diaper change entry to edit
   */
  diaperId: number;
  /**
   * The name of the child this diaper change is for
   */
  childName: string;
  /**
   * Whether the diaper was wet
   */
  wet?: boolean;
  /**
   * Whether the diaper contained solid waste
   */
  solid?: boolean;
  /**
   * The color of solid waste, if applicable
   */
  color?: string;
  /**
   * The amount, if applicable
   */
  amount?: string;
  /**
   * Notes about the diaper change
   */
  notes?: string;
  /**
   * Time of the diaper change (ISO string or HH:MM:SS format)
   */
  time?: string;
};

export default async function editDiaper({
  diaperId,
  childName,
  wet,
  solid,
  color,
  amount,
  notes,
  time,
}: EditDiaperInput) {
  const api = new BabyBuddyAPI();

  const children = await api.getChildren();
  const child = children.length === 1 ? children[0] : findChildByName(children, childName || "");

  if (!child) {
    throw new Error(`Child with name ${childName} not found`);
  }

  const childId = child.id;

  // Prepare update data using utility function
  const updateData = prepareDiaperUpdateData({
    childId,
    time,
    wet,
    solid,
    color,
    amount,
    notes,
  });

  // Only proceed if there's something to update
  if (Object.keys(updateData).length === 0) {
    return { message: "No updates provided" };
  }

  try {
    const updatedDiaper = await api.updateDiaper(diaperId, updateData);

    await showToast({
      style: Toast.Style.Success,
      title: "Diaper Change Updated",
      message: `Updated diaper change #${diaperId}`,
    });

    return updatedDiaper;
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: formatErrorMessage(error),
    });
  }
}
