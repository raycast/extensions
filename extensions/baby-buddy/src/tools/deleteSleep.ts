import { Action, showToast, Toast, Tool } from "@raycast/api";
import axios from "axios";
import { BabyBuddyAPI } from "../api";

type DeleteSleepInput = {
  /**
   * The ID of the sleep entry to delete
   */
  sleepId: number;
};

/**
 * Confirmation function that will be called before the action is executed
 */
export const confirmation: Tool.Confirmation<DeleteSleepInput> = async () => {
  return {
    style: Action.Style.Destructive,
    message: "Are you sure you want to delete this sleep entry?",
  };
};

export default async function deleteSleep({ sleepId }: DeleteSleepInput) {
  const api = new BabyBuddyAPI();

  try {
    await api.deleteSleep(sleepId);

    await showToast({
      style: Toast.Style.Success,
      title: "Sleep Deleted",
      message: `Deleted sleep #${sleepId}`,
    });

    return { success: true, sleepId };
  } catch (error) {
    let errorMessage = "Failed to delete sleep";
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
