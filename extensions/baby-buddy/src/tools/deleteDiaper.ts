import { Action, showToast, Toast, Tool } from "@raycast/api";
import axios from "axios";
import { BabyBuddyAPI } from "../api";

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
      errorMessage += `: ${JSON.stringify(error.response.data)}`;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: errorMessage,
    });

    throw error;
  }
}
