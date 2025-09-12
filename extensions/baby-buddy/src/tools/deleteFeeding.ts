import { Action, showToast, Toast, Tool } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios from "axios";
import { BabyBuddyAPI } from "../api";
import { formatErrorMessage } from "../utils";

type DeleteFeedingInput = {
  /**
   * The ID of the feeding entry to delete
   */
  feedingId: number;
};

/**
 * Confirmation function that will be called before the action is executed
 */
export const confirmation: Tool.Confirmation<DeleteFeedingInput> = async (input) => {
  return {
    style: Action.Style.Destructive,
    message: "Are you sure you want to delete this feeding entry?",
    info: [
      {
        name: "Feeding ID",
        value: `#${input.feedingId}`,
      },
    ],
  };
};

export default async function deleteFeeding({ feedingId }: DeleteFeedingInput) {
  const api = new BabyBuddyAPI();

  try {
    await api.deleteFeeding(feedingId);

    await showToast({
      style: Toast.Style.Success,
      title: "Feeding Deleted",
      message: `Deleted feeding #${feedingId}`,
    });

    return { success: true, feedingId };
  } catch (error) {
    let errorMessage = "Failed to delete feeding";
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
