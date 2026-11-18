import { showFailureToast } from "@raycast/utils";
import { showToast, Toast, LocalStorage } from "@raycast/api";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";

const EQ_ENABLED_KEY = "wiim_eq_enabled";

export default async function main() {
  try {
    const device = await resolveDevice();
    const api = new WiiMAPI(device);

    const stored = await LocalStorage.getItem<string>(EQ_ENABLED_KEY);
    const wasEnabled = stored === "true";
    const newState = !wasEnabled;

    await api.setEQEnabled(newState);
    await LocalStorage.setItem(EQ_ENABLED_KEY, String(newState));
    await showToast({ style: Toast.Style.Success, title: `EQ ${newState ? "On" : "Off"}` });
  } catch (error) {
    if (error instanceof WiiMAPIError) {
      const hint = error.getHint();
      showFailureToast(hint.title, { message: hint.message });
    } else {
      showFailureToast("Failed to toggle EQ", { message: String(error) });
    }
  }
}
