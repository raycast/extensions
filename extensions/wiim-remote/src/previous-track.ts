import { showFailureToast } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";

export default async function main() {
  try {
    const device = await resolveDevice();
    const api = new WiiMAPI(device);
    await api.previous();
    await showToast({ style: Toast.Style.Success, title: "Previous Track" });
  } catch (error) {
    if (error instanceof WiiMAPIError) {
      const hint = error.getHint();
      showFailureToast(hint.title, { message: hint.message });
    } else {
      showFailureToast("Failed to go to previous track", { message: String(error) });
    }
  }
}
