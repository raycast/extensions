import { popToRoot, showToast, Toast } from "@raycast/api";
import { play } from "./api/play";
import { STATION2_STREAM_URL } from "./constants/constants";
import { getErrorMessage } from "./utils/getError";

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Opening NTS Live 2 audio stream",
    });
    await play(STATION2_STREAM_URL);
    await popToRoot();
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("Error when playing station 2 stream:", error);
  }
}
