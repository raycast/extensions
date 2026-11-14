import { Clipboard, closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { parseLink } from "./lib/link";
import { LaunchMode, VivaldiNotFoundError, openInVivaldi } from "./lib/vivaldi";

type Preferences = {
  defaultAction: LaunchMode;
};

export default async function OpenClipboardLink() {
  const { defaultAction } = getPreferenceValues<Preferences>();
  const link = parseLink((await Clipboard.readText()) ?? "");

  if (!link) {
    await showHUD("The clipboard has no link");
    return;
  }

  try {
    // The profile is deliberately not read here: with no screen to pick one, following the
    // profile Vivaldi last used is the only choice that matches the window in front of you.
    openInVivaldi({ url: link.url, mode: defaultAction });
    await closeMainWindow();
    await showHUD(`Opened ${link.title} in Vivaldi`);
  } catch (error) {
    await showFailureToast(
      error,
      error instanceof VivaldiNotFoundError
        ? { title: "Vivaldi was not found" }
        : { title: "Could not open the link in Vivaldi" },
    );
  }
}
