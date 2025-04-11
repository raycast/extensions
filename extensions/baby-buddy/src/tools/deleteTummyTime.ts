import { Action, showToast, Toast, Tool } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios from "axios";
import { BabyBuddyAPI } from "../api";

type DeleteTummyTimeInput = {
  /**
   * The ID of the tummy time entry to delete
   */
  tummyTimeId: number;
};

/**
 * Confirmation function that will be called before the action is executed
 */
export const confirmation: Tool.Confirmation<DeleteTummyTimeInput> = async () => {
  return {
    style: Action.Style.Destructive,
    message: "Are you sure you want to delete this tummy time entry?",
  };
};

export default async function deleteTummyTime({ tummyTimeId }: DeleteTummyTimeInput) {
  const api = new BabyBuddyAPI();

  try {
    await api.deleteTummyTime(tummyTimeId);

    await showToast({
      style: Toast.Style.Success,
      title: "Tummy Time Deleted",
      message: `Deleted tummy time #${tummyTimeId}`,
    });

    return { success: true, tummyTimeId };
  } catch (error) {
    let errorMessage = "Failed to delete tummy time";
    if (axios.isAxiosError(error) && error.response) {
      errorMessage += `: ${JSON.stringify(error.response.data)}`;
    }

    await showFailureToast({
      title: "Error",
      message: errorMessage,
    });
  }
}
