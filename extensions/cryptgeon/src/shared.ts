import { Clipboard, getPreferenceValues, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { API, upload } from "cryptgeon";

export type Preferences = {
  server: string;
};

export const text = {
  noteSuccess: "Note created. Link copied to Clipboard.",
};

function checkAndSetServer() {
  const preferences = getPreferenceValues<Preferences>();
  try {
    API.setOptions({
      server: preferences.server,
    });
  } catch (e) {
    if (e instanceof TypeError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid server provided",
        message: `"${preferences.server}"`,
      });
    }
  }
}

export async function createNote(...args: Parameters<typeof upload>) {
  checkAndSetServer();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating...",
  });
  const url = await upload(args[0], args[1]);
  Clipboard.copy(url);
  toast.hide();
  showHUD(text.noteSuccess, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
