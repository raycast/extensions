import { showToast, Toast } from "@raycast/api";
import { useWindowInfo } from "./useWindowInfo";
import { isTimeoutError, TIMEOUT_ERROR_MESSAGE, TIMEOUT_ERROR_TOAST_TITLE } from "../utils/timeout";

export function useCurrentWindowSize() {
  const { getWindowInfo } = useWindowInfo();

  // Function to get and display current window size
  async function getCurrentWindowSize() {
    try {
      const windowInfo = await getWindowInfo();

      if (!windowInfo) {
        throw new Error("No window information available");
      }

      const { width, height } = windowInfo;

      // Format display size
      const displaySize = `${width}×${height}`;

      await showToast({
        style: Toast.Style.Success,
        title: `Current size: ${displaySize}`,
      });
    } catch (error) {
      console.error("Error getting window size:", error);

      if (isTimeoutError(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: TIMEOUT_ERROR_TOAST_TITLE,
          message: TIMEOUT_ERROR_MESSAGE,
        });
        return;
      }

      // Check if the error is related to no focused window
      const errorStr = String(error);
      if (errorStr.includes("frontmost") || errorStr.includes("window") || errorStr.includes("process")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No focused window",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to get size",
        });
      }
    }
  }

  return {
    getCurrentWindowSize,
  };
}
