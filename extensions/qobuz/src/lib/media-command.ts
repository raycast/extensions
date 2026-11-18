import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { sendMediaKey, type MediaKey } from "./media-keys";

export const mediaCommand = (key: MediaKey, hud: string) => async () => {
  try {
    await sendMediaKey(key);
    await showHUD(hud);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't control playback" });
  }
};
