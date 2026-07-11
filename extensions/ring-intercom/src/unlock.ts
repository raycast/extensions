import { LocalStorage, Toast, closeMainWindow, showToast } from "@raycast/api";
import { RingApi } from "./api/ring-api";
import { checkInternetConnection } from "./utils/connection";

export default async function Command() {
  if (!(await checkInternetConnection())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Internet",
      message: "Please check your internet connection",
    });
    return;
  }

  console.debug("Starting unlock command");
  showToast({
    style: Toast.Style.Animated,
    title: "Unlocking",
  });

  try {
    const refreshToken = await LocalStorage.getItem<string>("RING_REFRESH_TOKEN");
    if (!refreshToken) {
      console.debug("No refresh token found");
      throw new Error("Not authenticated. Please run the 'Authenticate' command.");
    }

    console.debug("Initializing Ring API");
    const ringApi = new RingApi({ refreshToken });
    const intercom = await ringApi.getFirstIntercom();

    if (!intercom) {
      throw new Error("No Ring Intercom found");
    }

    await ringApi.unlockDoorSequence(intercom);

    console.debug("Unlock successful");
    await Promise.all([
      closeMainWindow(),
      showToast({
        style: Toast.Style.Success,
        title: `🔓 ${intercom.description ?? ""} Unlocked`.trim(),
      }),
    ]);
  } catch (error) {
    console.error("Error during unlock process:", error);
    const errorMessage = String(error).replace(/^Error:\s*/, "");

    if (errorMessage.includes("Refresh token is not valid")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Expired",
        message: "Please re-authenticate",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Unlock",
      message: errorMessage,
    });
  }
}
