import { showFailureToast } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";

export default async function main() {
  try {
    const device = await resolveDevice();
    const api = new WiiMAPI(device);

    const newMuteState = await api.toggleMute();
    await showToast({ style: Toast.Style.Success, title: `Mute ${newMuteState ? "On" : "Off"}` });
  } catch (error) {
    if (error instanceof WiiMAPIError) {
      const hint = error.getHint();
      showFailureToast(hint.title, { message: hint.message });
    } else {
      showFailureToast("Failed to toggle mute", { message: String(error) });
    }
  }
}
