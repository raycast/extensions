import { Action, showToast, Toast, Tool } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios from "axios";
import { BabyBuddyAPI } from "../api";
import { formatErrorMessage } from "../utils";

type DeleteDiaperInput = {
  /**
   * The ID of the diaper change entry to delete
   */
  diaperId: number;
};

/**
 * Confirmation function that will be called before the action is executed
 */
export const confirmation: Tool.Confirmation<DeleteDiaperInput> = async () => {
  return {
    style: Action.Style.Destructive,
    message: "Are you sure you want to delete this diaper change?",
  };
};

export default async function deleteDiaper({ diaperId }: DeleteDiaperInput) {
  const api = new BabyBuddyAPI();

  try {
    await api.deleteDiaper(diaperId);

    await showToast({
      style: Toast.Style.Success,
      title: "Diaper Change Deleted",
      message: `Deleted diaper change #${diaperId}`,
    });

    return { success: true, diaperId };
  } catch (error) {
    let errorMessage = "Failed to delete diaper change";
    if (axios.isAxiosError(error) && error.response) {
      errorMessage += `: ${formatErrorMessage(error)}`;
    }

    await showFailureToast({
      title: "Error",
      message: errorMessage,
    });

    throw error;
  }
}
