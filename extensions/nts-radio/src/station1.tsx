import { Toast, popToRoot, showToast } from "@raycast/api";
import { play } from "./api/play";
import { STATION1_STREAM_URL } from "./constants/constants";
import { getErrorMessage } from "./utils/getError";

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Opening NTS Live 1 audio stream",
    });
    await play(STATION1_STREAM_URL);
    await popToRoot();
  } catch (err) {
    const error = getErrorMessage(err);
    await showToast({
      style: Toast.Style.Failure,
      title: "Sorry! Could not open NTS Live 1 audio stream",
    });
    console.log("Error when playing station 1 stream:", error);
  }
}
