import { showFailureToast } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";
import { getVolumeStep } from "./wiim/preferences";

export default async function main() {
  try {
    const device = await resolveDevice();
    const api = new WiiMAPI(device);
    const step = getVolumeStep();
    await api.volumeDown(step);
    await showToast({ style: Toast.Style.Success, title: `Volume -${step}` });
  } catch (error) {
    if (error instanceof WiiMAPIError) {
      const hint = error.getHint();
      showFailureToast(hint.title, { message: hint.message });
    } else {
      showFailureToast("Failed to decrease volume", { message: String(error) });
    }
  }
}
