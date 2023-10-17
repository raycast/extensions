import { Toast, getPreferenceValues, Application, Clipboard, open } from "@raycast/api";
import { createBookmark } from "./utils/api";
import { getCurrentTab, isSupportedBrowser } from "./utils/browser";
import { HTTPError } from "got";

const preferences = getPreferenceValues<{ browserApp?: Application }>();

export default async function () {
  const toast = new Toast({
    title: "Creating bookmark",
    style: Toast.Style.Animated,
  });

  toast.show();

  if (!preferences.browserApp) {
    toast.style = Toast.Style.Failure;
    toast.title = "Browser app is not set";
    toast.message = "Configure a browser in the extension preferences";
    return;
  }

  const browser = preferences.browserApp.bundleId;
  if (!isSupportedBrowser(browser)) {
    toast.style = Toast.Style.Failure;
    toast.title = "Browser app not supported";
    toast.message = `Cannot get the URL from ${preferences.browserApp.name}`;
    return;
  }

  const url = await getCurrentTab(browser);
  toast.message = url;

  try {
    const bookmark = await createBookmark({ url });
    toast.style = Toast.Style.Success;
    toast.title = "Bookmark created";
    toast.message = bookmark.title ?? bookmark.url;
    toast.primaryAction = {
      title: "Open in Pocket",
      shortcut: { modifiers: ["cmd", "shift"], key: "o" },
      onAction: () => {
        open(bookmark.pocketUrl);
      },
    };
    toast.secondaryAction = {
      title: "Copy Pocket URL",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => {
        Clipboard.copy(bookmark.pocketUrl);
      },
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;

    if (error instanceof HTTPError) {
      if (error.response.statusCode === 401 || error.response.statusCode === 403) {
        toast.title = "Invalid Credentials";
        toast.message = "Check you Pocket extension preferences";
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
}
