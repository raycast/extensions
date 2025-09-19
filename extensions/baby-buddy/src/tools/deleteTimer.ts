import { Action, showToast, Toast, Tool } from "@raycast/api";
import axios from "axios";
import { BabyBuddyAPI } from "../api";
import { formatErrorMessage } from "../utils";

type DeleteTimerInput = {
  /**
   * The ID of the timer to delete
   */
  timerId: number;
};

/**
 * Confirmation function that will be called before the action is executed
 */
export const confirmation: Tool.Confirmation<DeleteTimerInput> = async (input) => {
  // Fetch timer details to get the name
  try {
    const api = new BabyBuddyAPI();
    const timer = await api.getTimerById(input.timerId);

    if (timer) {
      // Try to get child name for additional context
      let childName = "";
      try {
        childName = await api.getChildName(timer.child);
      } catch {
        // Ignore errors with getting child name
      }

      return {
        style: Action.Style.Destructive,
        message: "Are you sure you want to delete this timer?",
        info: [
          {
            name: "Timer Name",
            value: timer.name,
          },
          {
            name: "Child",
            value: childName || "Unknown",
          },
          {
            name: "Start Time",
            value: new Date(timer.start).toLocaleString(),
          },
          {
            name: "Timer ID",
            value: `#${input.timerId}`,
          },
        ],
      };
    } else {
      return {
        style: Action.Style.Destructive,
        message: "Are you sure you want to delete this timer?",
        info: [
          {
            name: "Timer ID",
            value: `#${input.timerId}`,
          },
        ],
      };
    }
  } catch (error) {
    // Fallback in case we can't get the timer name
    return {
      style: Action.Style.Destructive,
      message: "Are you sure you want to delete this timer?",
      info: [
        {
          name: "Timer ID",
          value: `#${input.timerId}`,
        },
      ],
    };
  }
};

/**
 * Stop or delete a timer
 */
export default async function deleteTimer({ timerId }: DeleteTimerInput) {
  const api = new BabyBuddyAPI();

  try {
    await api.deleteTimer(timerId);

    await showToast({
      style: Toast.Style.Success,
      title: "Timer Deleted",
      message: `Deleted timer #${timerId}`,
    });

    return { success: true, timerId };
  } catch (error) {
    let errorMessage = "Failed to delete timer";
    if (axios.isAxiosError(error) && error.response) {
      errorMessage += `: ${formatErrorMessage(error)}`;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Error Deleting Timer",
      message: errorMessage,
    });

    throw error;
  }
}
